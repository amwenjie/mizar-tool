import { cyan, green, red, yellow } from "colorette";
import CopyWebpackPlugin from "copy-webpack-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import DirectoryNamedWebpackPlugin from "directory-named-webpack-plugin";
import ESLintWebpackPlugin from "eslint-webpack-plugin";
import fs from "fs-extra";
import klaw from "klaw";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "path";
import StylelintPlugin from "stylelint-webpack-plugin";
import TerserJSPlugin from "terser-webpack-plugin";
import webpack, { type Compiler, type RuleSetRule, type WebpackPluginInstance } from "webpack";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import { WebpackManifestPlugin } from "webpack-manifest-plugin";
import getGlobalConfig, { IGlobalConfig, devLocalIdentName, prodLocalIdentName } from "../getGlobalConfig";
import { ConfigHelper } from "../libs/ConfigHelper";
import Logger from "../libs/Logger";
import GatherPageDepsPlugin from "../libs/plugins/page-deps-mainfest-plugin";
import { WebpackTaskBase } from "../libs/WebpackTaskBase";
import { HelperTask } from "./HelperTask";

const log = Logger("IsomorphicPack");
export class IsomorphicPack extends WebpackTaskBase {
    private clientEntrySrc = "src/isomorphic/pageRouters";
    private pageSrc = "src/isomorphic/pages";
    private styleSrc = "src/isomorphic/styleEntries";
    private globalConfig: IGlobalConfig;
    private publicPath = "";

    constructor(taskName = "IsomorphicPack") {
        super(taskName);
        this.globalConfig = getGlobalConfig();
        this.dist = path.resolve(`${this.rootPath}${this.globalConfig.clientOutput}`);
        this.publicPath = this.getPublicPath();
    }

    private getPublicPath() {
        const path = [
            this.isDebugMode ? "/" : ConfigHelper.getCDN(),
            this.globalConfig.publicPath,
            'client/'
        ].join("");
        log.info("isomorphicPack getPublicPath: ", path);
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
                log.info("IsomorphicPack.styleScan.end", path.resolve(this.rootPath));
                log.info("IsomorphicPack.styleScan.entries", entries);
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
                log.info("IsomorphicPack.pageScan.end", path.resolve(this.rootPath));
                log.info("IsomorphicPack.pageScan.entries", entries);
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
                log.info("IsomorphicPack.clientEntryScan.end", path.resolve(this.rootPath));
                log.info("IsomorphicPack.clientEntryScan.entries", entries);
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
                .all([this.pageScan(), this.clientEntryScan()])
                .then((entries: [object, object]) => {
                    const combinedEntries = {
                        // ...entries[0],
                        ...entries[1],
                        // index: {
                        //     import: path.resolve(this.rootPath, this.clientEntrySrc, "./index.tsx"),
                        //     dependOn: Object.keys(entries[0]),
                        // },
                    };
                    log.info("IsomorphicPack.pack.keys", Object.keys(combinedEntries).join(","));
                    resolve(combinedEntries);
                })
                .catch(e => {
                    log.error(red("scan entry cause an error: "));
                    log.error(e);
                    resolve({});
                });
        });
    }

    private shouldSourceModuled(resourcePath: string): boolean {
        // log.info('####### resourcePath: ', resourcePath);
        // log.info('!/node_modules/i.test(resourcePath): ', !/node_modules/i.test(resourcePath));
        // log.info('$$$$$$$ /[\\/]components?[\\/]|[\\/]pages?[\\/]/i.test(resourcePath): ', /[\\/]components?[\\/]|[\\/]pages?[\\/]/i.test(resourcePath));
        return /[\\/]components?[\\/]|[\\/]pages?[\\/]/i.test(resourcePath);
    }

    protected async compile(): Promise<void|Error> {
        log.info("->", "IsomorphicPack", HelperTask.taking());
        const entry: webpack.EntryObject = await this.scan();
        if (!entry || Object.keys(entry).length === 0) {
            log.warn(yellow(`${cyan(this.taskName)}, scan emtpy entry`));
            return;
        }
        log.info("run.entry", entry);
        // log.info("IsomorphicPack.pack.run", entry);
        // const mode = this.isDebugMode ? JSON.stringify("development") : JSON.stringify("production");
        const config: webpack.Configuration = {
            mode: this.getEnvDef(),
            // cache: true,
            // debug: true,
            devtool: this.isDebugMode ? "source-map" : undefined,
            entry,
            output: {
                chunkFilename: "[name]_[contenthash:8].js",
                publicPath: this.publicPath,
                filename: "[name]_[contenthash:8].js",
                path: this.dist,
                assetModuleFilename: "assets/[name]_[contenthash:8][ext][query]",
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
            name: "IsomorphicPack",
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
            optimization: this.getOptimization().optimization,
        };
        log.info("pack", { config: JSON.stringify(config) });
        await super.compile(config);
    }

    private getOptimization(): webpack.Configuration {
        return {
            optimization: {
                minimize: !this.isDebugMode,
                chunkIds: this.isDebugMode ? "named" : "deterministic",
                moduleIds: this.isDebugMode ? "named" : "deterministic",
                runtimeChunk: {
                    name: "runtime",
                },
                splitChunks: {
                    // chunks: "all",
                    cacheGroups: {
                        libBase: {
                            test: /[\\/](?:core\-js|raf|react(?:\-[^\\/]+)?|redux(?:\-[^\\/]+)?)[\\/]/,
                            name: "lib",
                            priority: 30,
                            chunks: "all",
                            // maxSize: 204800,
                        },
                        nmDeps: {
                            test: /[\\/]node_modules[\\/]/,
                            name: "nmdeps",
                            priority: 20,
                            chunks: "all",
                            reuseExistingChunk: true,
                            // maxSize: 204800,
                        },
                        common: {
                            name: "common",
                            minChunks: 2,
                            chunks: "initial",
                            reuseExistingChunk: true,
                        },
                    },
                },
                minimizer: [
                    new TerserJSPlugin({
                        terserOptions: {
                            format: {
                                comments: false,
                            },
                        },
                        extractComments: false,
                    }),
                    new CssMinimizerPlugin(),
                ],
            }
        };
    }

    private getRules(): (RuleSetRule | "...")[] {
        let localIdentName = prodLocalIdentName;
        let sourceMap = false;
        if (this.isDebugMode) {
            localIdentName = devLocalIdentName;
            sourceMap = true;
        }
        const tslintPath = path.resolve(`${this.rootPath}tslint.json`);
        const tsConfigPath = path.resolve(`${this.rootPath}tsconfig.json`);
        const rules = [];
        const tslintConfig = ConfigHelper.get("tslint", true);
        if (tslintConfig) {
            rules.push({
                test: /\.tsx?$/,
                enforce: "pre",
                loader: "tslint-loader",
                options: {
                    configFile: fs.existsSync(tslintPath) ? tslintPath : "",
                    tsConfigFile: fs.existsSync(tsConfigPath) ? tsConfigPath : "",
                },
            });
        }
        rules.push({
            test: /\.tsx?$/i,
            exclude: /\.d\.ts$/i,
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
            test: /[\\/]isomorphic[\\/]pageRouters[\\/].+\.tsx?$/,
            include: [path.resolve(`${this.rootPath}src`)],
            use: [
                {
                    loader: path.resolve(__dirname, "../libs/loaders/router-loadable-loader"),
                },
            ],
        });
        rules.push({
            test: /[\\/]isomorphic[\\/].+[\\/][A-Z][^\\/]+[\\/]index\.tsx?$/,
            include: [path.resolve(`${this.rootPath}src`)],
            use: [
                {
                    loader: path.resolve(__dirname, "../libs/loaders/connect-default-param-loader"),
                },
            ],
        });
        rules.push({
            test: /\.css$/i,
            use: [
                {
                    loader: MiniCssExtractPlugin.loader,
                },
                {
                    loader: "css-loader",
                    options: {
                        importLoaders: 1,
                        sourceMap,
                        // modules: true,
                        modules: {
                            auto: this.shouldSourceModuled,
                            localIdentName: localIdentName,
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
            ],
            type: "javascript/auto",
        });
        rules.push({
            test: /\.less$/i,
            use: [
                {
                    loader: MiniCssExtractPlugin.loader,
                },
                {
                    loader: "css-loader",
                    options: {
                        importLoaders: 2,
                        sourceMap,
                        modules: {
                            auto: this.shouldSourceModuled,
                            localIdentName: localIdentName,
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
                {
                    loader: "less-loader",
                    options: Object.assign(
                        {
                            sourceMap,
                        },
                        ConfigHelper.get("less-loader", {}),
                    ),
                },
            ],
            type: "javascript/auto",
        });
        rules.push({
            test: /\.s[ac]ss$/i,
            use: [
                {
                    loader: MiniCssExtractPlugin.loader,
                },
                {
                    loader: "css-loader",
                    options: {
                        importLoaders: 2,
                        sourceMap,
                        modules: {
                            auto: this.shouldSourceModuled,
                            localIdentName: localIdentName,
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
                {
                    loader: "sass-loader",
                    options: Object.assign(
                        {
                            sourceMap,
                        },
                        ConfigHelper.get("sass-loader", {}),
                    ),
                },
            ],
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
        const stylelintConfig = ConfigHelper.get("stylelint", {
            extensions: ["css", "less", "scss", "sass"],
            files: "./src",
        });
        log.info("stylelintConfig: ", stylelintConfig);
        if (stylelintConfig) {
            plugins.push(new StylelintPlugin(stylelintConfig));
        }
        plugins.push(new webpack.DefinePlugin(defineOption));

        const esLintConfig = ConfigHelper.get("eslint", {
            files: "./src",
            failOnError: !this.isDebugMode,
        });
        log.info("esLintConfig: ", esLintConfig);
        if (esLintConfig) {
            plugins.push(new ESLintWebpackPlugin(esLintConfig));
        }

        plugins.push(new MiniCssExtractPlugin({
            filename: "[name]_[contenthash:8].css",
            // chunkFilename: "[name]-chunk-[id]_[contenthash:8].css",
        }));
        plugins.push(new CopyWebpackPlugin({
            patterns: [
                {
                    context: "src",
                    from: "public/**/*",
                },
            ]
        }));
        plugins.push(new WebpackManifestPlugin({
            fileName: path.resolve(this.globalConfig.rootOutput, this.globalConfig.assetsMainfest),
        }));
        plugins.push(new GatherPageDepsPlugin({
            isDebug: this.isDebugMode,
        }));
        // if (this.isDebugMode) {
        //     plugins.push(new webpack.HotModuleReplacementPlugin());
        // }
        if (this.isAnalyzMode) {
            plugins.push(new BundleAnalyzerPlugin({
                analyzerMode: this.isDebugMode ? "server" : "disabled",
                generateStatsFile: !this.isDebugMode,
                openAnalyzer: !!this.isDebugMode,
            }));
        }
        return plugins;
    }
}

export default IsomorphicPack;
