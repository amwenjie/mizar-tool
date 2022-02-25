import { cyan, green, red, yellow } from "colorette";
import DirectoryNamedWebpackPlugin from "directory-named-webpack-plugin";
import fs from "fs-extra";
import klaw from "klaw";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "path";
import webpack, { 
    container,
    type Compiler,
    type RuleSetRule,
    type WebpackPluginInstance
} from "webpack";
import FederationModuleIdPlugin from "webpack-federation-module-id-plugin";
import getGlobalConfig, { IGlobalConfig, devLocalIdentName, prodLocalIdentName } from "../getGlobalConfig";
import { ConfigHelper } from "../libs/ConfigHelper";
import Logger from "../libs/Logger";
import FederationStatsPlugin from "../libs/plugins/federation-stats-plugin";
import { WebpackTaskBase } from "../libs/WebpackTaskBase";
import { HelperTask } from "./HelperTask";

const log = Logger("ModuleFederatePack");

const cssModuleRegExp = /[\\/]components?[\\/]|[\\/]pages?[\\/]|\.module\.(?:css|less|s[ac]ss)$/i;
export class ModuleFederatePack extends WebpackTaskBase {
    private clientEntrySrc = "src/isomorphic/moduleFederate";
    private pageSrc = "src/isomorphic/pages";
    private styleSrc = "src/isomorphic/styleEntries";
    private globalConfig: IGlobalConfig;
    private publicPath = "";

    constructor(taskName = "ModuleFederatePack") {
        super(taskName);
        this.globalConfig = getGlobalConfig();
        this.dist = path.resolve(`${this.rootPath}${this.globalConfig.clientOutput}/federate`);
        this.publicPath = this.getPublicPath();
    }

    private getPublicPath() {
        const path = [
            this.isDebugMode ? "/" : ConfigHelper.getCDN(),
            this.globalConfig.publicPath,
            'client/'
        ].join("");
        log.info("ModuleFederatePack getPublicPath: ", path);
        return path;
    }

    private async styleScan(): Promise<object|Error> {
        return new Promise((resolve, reject) => {
            const entries = {};
            const entryDir = this.rootPath + this.styleSrc;
            if (!fs.existsSync(entryDir)) {
                log.warn(yellow(`isomorphic pack styleEntry 入口目录不存在：, ${entryDir}`));
                resolve({});
                return;
            }
            const walk = klaw(entryDir, {
                depthLimit: 0,
            });
            walk.on("data", (state) => {
                const src = state.path;
                const isFile = state.stats.isFile();
                if (isFile && /\.css$|\.s[ac]ss$|\.less$/i.test(src)) {
                    const fileObj = path.parse(src);
                    // const dirName = src.replace(path.resolve(this.rootPath), "")
                    //     .replace(".css", "")
                    //     .replace(".less", "")
                    //     .replace(".sass", "")
                    //     .replace(".scss", "")
                    //     .replace(/\\/g, "/")
                    //     .replace("/" + this.styleSrc + "/", "");
                    entries["styleEntry/" + fileObj.name] = [src];
                }
            });
            walk.on("end", () => {
                log.info("ModuleFederatePack.styleScan.end", path.resolve(this.rootPath));
                log.info("ModuleFederatePack.styleScan.entries", entries);
                resolve(entries);
            });
            walk.on("error", error => {
                reject(error);
            });
        });
    }

    private async pageScan(): Promise<object|Error> {
        return new Promise((resolve, reject) => {
            const entries = {};
            const entryDir = this.rootPath + this.pageSrc;
            if (!fs.existsSync(entryDir)) {
                log.warn(yellow(`isomorphic pack build 入口目录不存在：, ${entryDir}`));
                resolve({});
                return;
            }
            const walk = klaw(entryDir, {
                depthLimit: 0,
            });
            walk.on("data", async (state) => {
                const src = state.path;
                const isDir = state.stats.isDirectory();
                if (isDir) {
                    const dirArr = src.split(path.sep);
                    const dirName = dirArr[dirArr.length - 1];
                    if (/^[A-Z].+/.test(dirName)) {
                        const sm = [
                            src + "/index.tsx",
                        ];
                        const lessFile = src + "/index.less";
                        try {
                            if (fs.existsSync(lessFile)) {
                                sm.push(lessFile);
                            }
                        } catch (e) {
                            console.warn(e);
                        }
                        entries["page/" + dirName] = sm;
                    }
                }
            });
            walk.on("end", () => {
                log.info("ModuleFederatePack.pageScan.end", path.resolve(this.rootPath));
                log.info("ModuleFederatePack.pageScan.entries", entries);
                resolve(entries);
            });
            walk.on("error", (error) => {
                reject(error);
            });
        });
    }

    private clientEntryScan(): Promise<object|Error> {
        return new Promise((resolve, reject) => {
            const esDepends = [
                "core-js/features/object",
                "core-js/features/array",
                "core-js/features/map",
                "core-js/features/set",
                "core-js/features/promise",
                "raf/polyfill",
            ];
            const entries: any = {};
            const entryDir = this.rootPath + this.clientEntrySrc;
            if (!fs.existsSync(entryDir)) {
                log.warn(yellow(`isomorphic pack build 入口目录不存在：, ${entryDir}`));
                resolve({});
                return;
            }
            const walk = klaw(entryDir, {
                depthLimit: 0,
            });
            walk.on("data", (state) => {
                const src = state.path;
                const isFile = state.stats.isFile();
                if (isFile && /\.ts$|\.tsx$|\.js$/i.test(src)) {
                    const fileObj = path.parse(src);
                    // const dirName = src.replace(path.resolve(this.rootPath), "")
                    //     .replace(".tsx", "")
                    //     .replace(".ts", "")
                    //     .replace(/\\/g, "/")
                    //     .replace("/" + this.src + "/", "");
                    entries[fileObj.name] = esDepends.concat(src);
                }
            });
            walk.on("end", () => {
                log.info("ModuleFederatePack.clientEntryScan.end", path.resolve(this.rootPath));
                log.info("ModuleFederatePack.clientEntryScan.entries", entries);
                resolve(entries);
            });
            walk.on("error", (error) => {
                reject(error);
            });
        });
    }

    /**
     * 入口文件搜寻
     */
    private async scan(): Promise<webpack.EntryObject> {
        return new Promise(async resolve => {
            Promise
                .all([this.clientEntryScan()])
                .then((entries: object) => {
                    const combinedEntries = {
                        ...entries[0],
                        // ...entries[1],
                        // index: {
                        //     import: path.resolve(this.rootPath, this.clientEntrySrc, "./index.tsx"),
                        //     dependOn: Object.keys(entries[0]),
                        // },
                    };
                    log.info("ModuleFederatePack.pack.keys", Object.keys(combinedEntries).join(","));
                    resolve(combinedEntries);
                })
                .catch(e => {
                    log.error(red("scan entry cause an error: "));
                    log.error(e);
                    resolve({});
                });
        });
    }

    private getCssModuleMode(resourcePath: string): "global" | "local" {
        if (cssModuleRegExp.test(resourcePath)) {
            return "local";
        }
        return "global";
    }

    private shouldSourceModuled(resourcePath: string): boolean {
        return cssModuleRegExp.test(resourcePath);
    }

    protected async compile(): Promise<void|Error> {
        log.info("->", "ModuleFederatePack", HelperTask.taking());
        // log.info("ModuleFederatePack.pack.run", entry);
        // const mode = this.isDebugMode ? JSON.stringify("development") : JSON.stringify("production");
        const config: webpack.Configuration = {
            mode: this.getEnvDef(),
            // cache: true,
            // debug: true,
            entry: "./src/moduleFederation/index.ts",
            devtool: this.isDebugMode ? "source-map" : undefined,
            output: {
                publicPath: "auto", // this.publicPath,
                path: this.dist,
            },
            externals: ({ context, request }, callback) => {
                const isExternal = /[\\/]server[\\/]/i.test(request);
                if (isExternal || request === "node-mocks-http") {
                    callback(null, "''");
                } else {
                    callback();
                }
            },
            module: {
                rules: this.getRules(),
            },
            name: "ModuleFederatePack",
            plugins: this.getPlugins(),
            resolve: {
                extensions: [".ts", ".tsx", ".js", ".css", ".png", ".jpg", ".gif", ".less", "sass", "scss", "..."],
                modules: [
                    path.resolve(__dirname, "src"),
                    "node_modules",
                ],
                plugins: [
                    new DirectoryNamedWebpackPlugin(),
                ],
            },
            optimization: this.getOptimization() as any,
        };
        log.info("pack", { config: JSON.stringify(config) });
        try {
            await super.compile(config);
        } catch (e) {}
    }

    private getOptimization() {
        return {
            minimize: !this.isDebugMode,
            splitChunks: false,
        };
    }

    private getCssLoaders(extraLoaders = []) {
        const loaders = [];
        loaders.push({
            loader: MiniCssExtractPlugin.loader,
        });
        let localIdentName = prodLocalIdentName;
        let sourceMap = false;
        if (this.isDebugMode) {
            localIdentName = devLocalIdentName;
            sourceMap = true;
        }
        return loaders.concat([
            {
                loader: "css-loader",
                options: {
                    importLoaders: 1 + extraLoaders.length,
                    sourceMap,
                    modules: {
                        auto: this.shouldSourceModuled,
                        mode: this.getCssModuleMode,
                        localIdentName,
                        namedExport: true,
                    },
                },
            },
            {
                loader: "postcss-loader",
                options: Object.assign(
                    {
                        postcssOptions: {
                            plugins: [
                                "postcss-preset-env",
                            ],
                        },
                    },
                    ConfigHelper.get("postcss-loader", {}),
                ),
            },
        ], extraLoaders);
    }

    private getRules(): (RuleSetRule | "...")[] {
        const rules = [];
        rules.push({
            exclude: /[\\/]node_modules[\\/]|\.d\.ts$/i,
            test: /\.tsx?$/i,
            use: [
                {
                    loader: "ts-loader",
                    options: {
                        compilerOptions: {
                            declaration: false,
                        },
                    },
                },
            ],
        });
        rules.push({
            exclude: /\.d\.ts$/i,
            test: /[\\/]src[\\/]isomorphic[\\/]routers(?:[\\/][^\\/]+?){1}\.tsx?$/,
            use: [
                {
                    loader: path.resolve(__dirname, "../libs/loaders/router-loadable-loader"),
                },
            ],
        });
        rules.push({
            exclude: /\.d\.ts$/i,
            test: /[\\/]src[\\/]isomorphic[\\/].+[\\/][A-Z][^\\/]+[\\/]index\.tsx?$/,
            use: [
                {
                    loader: path.resolve(__dirname, "../libs/loaders/connect-default-param-loader"),
                },
            ],
        });
        rules.push({
            test: /\.css$/i,
            use: this.getCssLoaders(),
            type: "javascript/auto",
        });
        rules.push({
            test: /\.less$/i,
            use: this.getCssLoaders([
                {
                    loader: "less-loader",
                    options: Object.assign(
                        {
                            sourceMap: this.isDebugMode,
                        },
                        ConfigHelper.get("less-loader", {}),
                    ),
                },
            ]),
            type: "javascript/auto",
        });
        rules.push({
            test: /\.s[ac]ss$/i,
            use: this.getCssLoaders([
                {
                    loader: "sass-loader",
                    options: Object.assign(
                        {
                            sourceMap: this.isDebugMode,
                        },
                        ConfigHelper.get("sass-loader", {}),
                    ),
                },
            ]),
            type: "javascript/auto",
        });
        rules.push({
            test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|swf)(\?.*)?$/i,
            type: "asset",
        });
        return rules;
    }

    private getEnvDef(): "development"|"production" {
        return this.isDebugMode ? "development" : "production";
    }

    private getPlugins(): (
		| ((this: Compiler, compiler: Compiler) => void)
		| WebpackPluginInstance
	)[] {
        const defineOption = {
            IS_SERVER_RUNTIME: JSON.stringify(false),
            IS_DEBUG_MODE: JSON.stringify(!!this.isDebugMode),
        };

        const plugins = [];
        
        plugins.push(new MiniCssExtractPlugin({
            filename: "[name]_[contenthash:8].css",
            // chunkFilename: "[name]-chunk-[id]_[contenthash:8].css",
        }));
        plugins.push(new webpack.DefinePlugin(defineOption));

        // if (this.isDebugMode) {
        //     plugins.push(new webpack.HotModuleReplacementPlugin());
        // }
        const moduleFederationConfig = ConfigHelper.get("federation", false);
        if (moduleFederationConfig && moduleFederationConfig.exposes) {
            if (!moduleFederationConfig.name) {
                moduleFederationConfig.name = ConfigHelper.getPackageName();
            }
            if (!moduleFederationConfig.filename) {
                moduleFederationConfig.filename = "mfEntry.js";
            }
            plugins.push(new FederationStatsPlugin());
            plugins.push(new FederationModuleIdPlugin());
            plugins.push(new container.ModuleFederationPlugin(moduleFederationConfig));
        }
        return plugins;
    }
}

export default ModuleFederatePack;
