import { green, red, yellow } from "colorette";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import DirectoryNamedWebpackPlugin from "directory-named-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import TerserJSPlugin from "terser-webpack-plugin";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import fs from "fs-extra";
import klaw from "klaw";
import Path from "path";
import webpack from "webpack";
import getGlobalConfig, { IGlobalConfig, devLocalIdentName, prodLocalIdentName } from "../getGlobalConfig";
import { ConfigHelper } from "../libs/ConfigHelper";
import Logger from "../libs/Logger";
import { WebpackTaskBase } from "../libs/WebpackTaskBase";
import { HelperTask } from "./HelperTask";

const log = Logger("StandalonePack");
export class StandalonePack extends WebpackTaskBase {
    private standaloneEntrySrc = "src/standalone";
    private analyzMode = false;
    private globalConfig: IGlobalConfig;
    private outputPath = "";
    constructor() {
        super("StandalonePack");
        this.setTaskName("StandalonePack");
    }

    public setAnalyzMode(analyzMode) {
        this.analyzMode = analyzMode;
        return this;
    }
    public async run() {
        const shouldStandaloneBuild = ConfigHelper.get("standalone", false);
        if (!shouldStandaloneBuild) {
            return;
        }
        this.globalConfig = getGlobalConfig();
        this.outputPath = `${this.rootPath}${this.globalConfig.staticOutput}/standalone`;

        log.info("->", "StandalonePack", HelperTask.taking());
        try {
            const entry = await this.scan();
            if (!entry || Object.keys(entry).length === 0) {
                log.warn(yellow(`${this.taskName}, scan emtpy entry`));
                return;
            }
            log.debug(this.taskName, "run.entry", entry);
            await this.pack(entry);
        } catch (error) {
            log.error(this.taskName, "FATAL_ERROR", error.message);
            throw error;
        }
    }

    private getStyleRuleLoaderOption(loaderName) {
        return ConfigHelper.get(loaderName, {});
    }

    private entryScan() {
        return new Promise((resolve, reject) => {
            const entries: any = {};
            const entryDir = this.rootPath + this.standaloneEntrySrc;
            if (!fs.existsSync(entryDir)) {
                log.warn(yellow(`standalone pack build 入口目录不存在：, ${entryDir}`));
                resolve({});
                return;
            }
            const walk = klaw(entryDir);
            walk.on("data", (state) => {
                const src = state.path;
                const isFile = state.stats.isFile();
                if (isFile && /\.ts$|\.tsx$|\.js$/i.test(src)) {
                    const entryKey = src.replace(Path.resolve(entryDir), "")
                        .replace(".tsx", "")
                        .replace(".ts", "")
                        .replace(".js", "")
                        .replace(/\\/g, "/");
                    entries[entryKey.slice(1)] = src;
                }
            });
            walk.on("end", () => {
                log.debug("StandalonePack.entryScan.end", Path.resolve(this.rootPath));
                log.debug("StandalonePack.entryScan.entries", entries);
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
    private async scan() {
        return new Promise(async (resolve, reject) => {
            Promise.all([this.entryScan()])
            .then((entries: [object]) => {
                const combinedEntries = {
                    ...entries[0]
                };
                log.debug("StandalonePack.pack.keys", Object.keys(combinedEntries).join(","));
                resolve(combinedEntries);
            }).catch(e => {
                reject(e);
            });
        });
    }

    private shouldSourceModuled(resourcePath: string): boolean {
        // log.debug('resourcePath: ', resourcePath);
        // log.debug('!/node_modules/i.test(resourcePath): ', !/node_modules/i.test(resourcePath));
        // log.debug('/components?|pages?/i.test(resourcePath): ', /components?|pages?/i.test(resourcePath));
        return /components?|pages?/i.test(resourcePath);
    }

    private async pack(entry) {
        // log.info("StandalonePack.pack.run", entry);
        const mode = this.watchModel ? "development" : "production";
        // const mode = this.watchModel ? JSON.stringify("development") : JSON.stringify("production");
            
        const config: webpack.Configuration = {
            mode,
            // cache: false,
            // debug: true,
            devtool: this.watchModel ? "source-map" : undefined,
            ...this.getEntryAndOutputConfig(entry),
            externals: this.getExternalConfig(),
            module: {
                rules: this.getRules(),
            },
            name: "StandalonePack",
            plugins: this.getPlugins({entry}),
            resolve: {
                extensions: [".ts", ".tsx", ".js", ".css", ".png", ".jpg", ".gif", ".less", "sass", "scss", "..."],
                modules: [
                    Path.resolve(__dirname, "src"),
                    "node_modules",
                ],
                plugins: [
                    new DirectoryNamedWebpackPlugin(),
                ],
            },
            optimization: this.getOptimization().optimization,
        };
        log.info(this.taskName, "pack", config);

        try {
            await this.compile(config);
        } catch (e) {
            log.error(this.taskName, " webpacking raised an error: ", e);
        }
    }

    private getOptimization(): webpack.Configuration {
        return {
            optimization: {
                minimize: !this.watchModel,
                chunkIds: this.watchModel ? "named" : "deterministic",
                moduleIds: this.watchModel ? "named" : "deterministic",
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

    private getRules() {
        let localIdentName = prodLocalIdentName;
        let sourceMap = false;
        if (this.watchModel) {
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
            test: /\/src\/isomorphic\/.+\/index\.tsx?$/,
            use: [
                {
                    loader: Path.resolve(__dirname, "../libs/loaders/connect-default-param-loader"),
                    options: {
                        IS_SERVER_RUNTIME: false,
                    }
                },
            ],
        });
        rules.push({
            test: /\/pageRouters\/.+\.tsx?$/,
            use: [
                {
                    loader: Path.resolve(__dirname, "../libs/loaders/router-loadable-loader"),
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
                    options: Object.assign({
                        postcssOptions: {
                            plugins: [
                                "postcss-preset-env",
                            ],
                        },
                    }, this.getStyleRuleLoaderOption("postcss-loader")),
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
                    options: Object.assign({
                        postcssOptions: {
                            plugins: [
                                "postcss-preset-env",
                            ],
                        },
                    }, this.getStyleRuleLoaderOption("postcss-loader")),
                },
                {
                    loader: "less-loader",
                    options: Object.assign({
                        sourceMap,
                    }, this.getStyleRuleLoaderOption("less-loader")),
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
                    options: Object.assign({
                        postcssOptions: {
                            plugins: [
                                "postcss-preset-env",
                            ],
                        },
                    }, this.getStyleRuleLoaderOption("postcss-loader")),
                },
                {
                    loader: "sass-loader",
                    options: Object.assign({
                        sourceMap,
                    }, this.getStyleRuleLoaderOption("sass-loader")),
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

    private getPlugins({entry}) {
        const defineOption = {
            IS_SERVER_RUNTIME: JSON.stringify(false),
            IS_DEBUG_MODE: JSON.stringify(!!this.watchModel),
        };

        const plugins = [];
        plugins.push(new webpack.DefinePlugin(defineOption));
        plugins.push(new MiniCssExtractPlugin({
            filename: "[name].css",
            // chunkFilename: "[name]-chunk-[id]_[contenthash:8].css",
        }));
        if (this.analyzMode) {
            plugins.push(new BundleAnalyzerPlugin({
                analyzerMode: this.watchModel ? "server" : "disabled",
                generateStatsFile: !this.watchModel,
                openAnalyzer: !!this.watchModel,
            }));
        }
        return plugins;
    }

    private getEntryAndOutputConfig(entry) {
        const config = ConfigHelper.get("standalone", false);
        const returnedConfig: any = {
            entry,
            output: {
                filename: "[name].js",
                path: Path.resolve(this.outputPath),
                assetModuleFilename: "assets/[name][ext][query]",
            }
        };
        if (!config) {
            return returnedConfig;
        }
        returnedConfig.output.library = {
            name: ConfigHelper.getPackageName(),
            type: "assign",
        };
        // if (config === true) {
        //     // 需要standalone build，但是没有每个入口的配置，则采用output.library的配置
        //     returnedConfig.output.library = {
        //         name: ConfigHelper.getPackageName(),
        //         type: "assign",
        //     };
        // } else 
        if (typeof config === "object") {
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

    private getExternalConfig() {
        const config = ConfigHelper.get("standalone.externals", false);
        const serverExternal = ({ context, request }, callback) => {
            const isExternal = /\/server\//i.test(request);
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