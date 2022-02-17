import { cyan, green, red, yellow } from "colorette";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import DirectoryNamedWebpackPlugin from "directory-named-webpack-plugin";
import ESLintWebpackPlugin from "eslint-webpack-plugin";
import fs from "fs-extra";
import klaw from "klaw";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "path";
import StylelintPlugin from "stylelint-webpack-plugin";
import TerserJSPlugin from "terser-webpack-plugin";
import webpack, {
    type Compiler,
    type RuleSetRule,
    type WebpackPluginInstance,
} from "webpack";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import getGlobalConfig, { IGlobalConfig, devLocalIdentName, prodLocalIdentName } from "../getGlobalConfig";
import { ConfigHelper } from "../libs/ConfigHelper";
import Logger from "../libs/Logger";
import { WebpackTaskBase } from "../libs/WebpackTaskBase";
import { HelperTask } from "./HelperTask";

const log = Logger("StandalonePack");
export class StandalonePack extends WebpackTaskBase {
    private globalConfig: IGlobalConfig;

    constructor(taskName = "StandalonePack") {
        super(taskName);
        this.globalConfig = getGlobalConfig();
        this.src = path.resolve("./src/standalone");
        this.dist = path.resolve(`${this.rootPath}${this.globalConfig.staticOutput}/standalone`);
    }

    protected async compile(): Promise<void|Error> {
        const shouldStandaloneBuild = ConfigHelper.get("standalone", false);
        if (!shouldStandaloneBuild) {
            return;
        }
        log.info("->", "StandalonePack", HelperTask.taking());
        const entry: webpack.EntryObject = await this.scan();
        if (!entry || Object.keys(entry).length === 0) {
            log.warn(yellow(`${cyan(this.taskName)}, scan emtpy entry`));
            return;
        }
        log.info(cyan(this.taskName), "run.entry", entry);
        const mode = this.isDebugMode ? "development" : "production";
        // const mode = this.isDebugMode ? JSON.stringify("development") : JSON.stringify("production");
        const config: webpack.Configuration = {
            mode,
            // cache: false,
            // debug: true,
            devtool: this.isDebugMode ? "source-map" : undefined,
            ...this.getEntryAndOutputConfig(entry),
            externals: this.getExternalConfig(),
            module: {
                rules: this.getRules(),
            },
            name: "StandalonePack",
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
        log.info(cyan(this.taskName), "pack", config);
        await super.compile(config);
    }

    private entryScan() {
        return new Promise((resolve, reject) => {
            const entries: any = {};
            if (!fs.existsSync(this.src)) {
                log.warn(yellow(`standalone pack build 入口目录不存在：, ${this.src}`));
                resolve({});
                return;
            }
            const walk = klaw(this.src);
            walk.on("data", (state) => {
                const src = state.path;
                const isFile = state.stats.isFile();
                if (isFile && /\.ts$|\.tsx$|\.js$/i.test(src)) {
                    const entryKey = src.replace(path.resolve(this.src), "")
                        .replace(".tsx", "")
                        .replace(".ts", "")
                        .replace(".js", "")
                        .replace(/\\/g, "/");
                    entries[entryKey.slice(1)] = src;
                }
            });
            walk.on("end", () => {
                log.info("StandalonePack.entryScan.end", path.resolve(this.rootPath));
                log.info("StandalonePack.entryScan.entries", entries);
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
                .all([this.entryScan()])
                .then((entries: [object]) => {
                    const combinedEntries = {
                        ...entries[0]
                    };
                    log.info("StandalonePack.pack.keys", Object.keys(combinedEntries).join(","));
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
        // log.info('resourcePath: ', resourcePath);
        // log.info('!/node_modules/i.test(resourcePath): ', !/node_modules/i.test(resourcePath));
        // log.info('/components?|pages?/i.test(resourcePath): ', /components?|pages?/i.test(resourcePath));
        return /components?|pages?/i.test(resourcePath);
    }

    private getOptimization(): webpack.Configuration {
        return {
            optimization: {
                minimize: !this.isDebugMode,
                chunkIds: this.isDebugMode ? "named" : "deterministic",
                moduleIds: this.isDebugMode ? "named" : "deterministic",
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

    private getRules(): (RuleSetRule | "...")[]  {
        let localIdentName = prodLocalIdentName;
        let sourceMap = false;
        if (this.isDebugMode) {
            localIdentName = devLocalIdentName;
            sourceMap = true;
        }
        const rules = [];
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
            test: /[\\/]src[\\/]isomorphic[\\/]pageRouters(?:[\\/][^\\/]+?){1}\.tsx?$/,
            use: [
                {
                    loader: path.resolve(__dirname, "../libs/loaders/router-loadable-loader"),
                    options: {
                        IS_SERVER_RUNTIME: false,
                    }
                },
            ],
        });
        rules.push({
            test: /[\\/]src[\\/]isomorphic[\\/].+[\\/][A-Z][^\\/]+[\\/]index\.tsx?$/,
            use: [
                {
                    loader: path.resolve(__dirname, "../libs/loaders/connect-default-param-loader"),
                    options: {
                        IS_SERVER_RUNTIME: false,
                    }
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

    private getPlugins(): (
		| ((this: Compiler, compiler: Compiler) => void)
		| WebpackPluginInstance
	)[] {
        const defineOption = {
            IS_SERVER_RUNTIME: JSON.stringify(false),
            IS_DEBUG_MODE: JSON.stringify(!!this.isDebugMode),
        };

        const plugins = [];
        plugins.push(new webpack.DefinePlugin(defineOption));
        
        const stylelintConfig = ConfigHelper.get("stylelint", {
            extensions: ["css", "less", "scss", "sass"],
            files: "./src",
        });
        if (stylelintConfig) {
            plugins.push(new StylelintPlugin(stylelintConfig));
        }
        
        const esLintPluginConfig = ConfigHelper.get("eslint", {
            files: "./src",
        });
        if (esLintPluginConfig) {
            plugins.push(new ESLintWebpackPlugin(esLintPluginConfig));
        }
        plugins.push(new MiniCssExtractPlugin({
            filename: "[name].css",
            // chunkFilename: "[name]-chunk-[id]_[contenthash:8].css",
        }));
        if (this.isAnalyzMode) {
            plugins.push(new BundleAnalyzerPlugin({
                analyzerMode: this.isDebugMode ? "server" : "disabled",
                generateStatsFile: !this.isDebugMode,
                openAnalyzer: !!this.isDebugMode,
            }));
        }
        return plugins;
    }

    private getEntryAndOutputConfig(entry): any {
        const config = ConfigHelper.get("standalone", false);
        const returnedConfig: any = {
            entry,
            output: {
                filename: "[name].js",
                path: this.dist,
                assetModuleFilename: "assets/[name][ext][query]",
            }
        };
        if (!config) {
            return returnedConfig;
        }
        // returnedConfig.output.library = {
        //     name: ConfigHelper.getPackageName(),
        //     type: "assign",
        // };
        if (config === true) {
            // 需要standalone build，但是没有每个入口的配置，则采用output.library的配置
            returnedConfig.output.library = {
                name: ConfigHelper.getPackageName(),
                type: "assign",
            };
        } else if (typeof config === "object") {
            // 进行简单判断，typeof是object就认为是对象
            const entryKeys = Object.keys(entry);
            const returnedEntry = {};
            entryKeys.forEach(key => {
                if (key in config) {
                    // 说明自动获取的standalone entry文件在手动配置的config中存在，则替换entry的配置
                    // 暂时配置中不支持配置一个entry入口有多个文件，自动获取的entry[key]指定单个文件
                    returnedEntry[key] = {
                        import: entry[key],
                        library: config[key],
                    };
                } else {
                    returnedEntry[key] = entry[key];
                }
                returnedConfig.entry = returnedEntry;
            });
        }
        return returnedConfig;
    }

    private getExternalConfig(): any {
        const config = ConfigHelper.get("standalone.externals", false);
        const serverExternal = ({ context, request }, callback) => {
            const isExternal = /[\\/]server[\\/]/i.test(request);
            if (isExternal || request === "node-mocks-http") {
                callback(null, "''");
            } else {
                callback();
            }
        };

        if (config === false) {
            return serverExternal;
        }
        if (typeof config === "object" && !Array.isArray(config)) {
            return [serverExternal, config];
        } else {
            return [serverExternal].concat(config);
        }
    }
}
export default StandalonePack;