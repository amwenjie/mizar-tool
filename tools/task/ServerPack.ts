import { cyan, green } from "colorette";
import fs from "fs-extra";
import path from "path";
import webpack, { type RuleSetRule } from "webpack";
import nodeExternals from "webpack-node-externals";
import getGlobalConfig, { IGlobalConfig, devLocalIdentName, prodLocalIdentName } from "../getGlobalConfig";
import { ConfigHelper } from "../libs/ConfigHelper";
import { WebpackTaskBase } from "../libs/WebpackTaskBase";
import { HelperTask } from "./HelperTask";
import RunServer from "./RunServer";
import Logger from "../libs/Logger";
const log = Logger("ServerPack");

export class ServerPack extends WebpackTaskBase {
    private globalConfig: IGlobalConfig;
    private autoRun: boolean = false;
    private debugPort: number = 0;

    constructor(taskName = "ServerPack") {
        super(taskName);
        this.globalConfig = getGlobalConfig();
        this.src = path.resolve("./src/server/index");
        this.dist = path.resolve(`${this.globalConfig.rootOutput}`);
    }
    
    private shouldSourceModuled(resourcePath: string): boolean {
        // log.warn('!/node_modules/i.test(resourcePath): ', !/node_modules/i.test(resourcePath));
        // log.warn('/components?|pages?/i.test(resourcePath): ', /components?|pages?/i.test(resourcePath));
        return /components?|pages?/i.test(resourcePath);
    }
    
    private getStyleRuleLoaderOption(loaderName): object {
        return ConfigHelper.get(loaderName, {});
    }

    private getRules(): (RuleSetRule | "...")[]  {
        let localIdentName = prodLocalIdentName;
        let sourceMap = false;
        if (this.isDebugMode) {
            localIdentName = devLocalIdentName;
            sourceMap = true;
        }
        const tslintPath = path.resolve(`${this.rootPath}tslint.json`);
        const tsConfigPath = path.resolve(`${this.rootPath}tsconfig.json`);
        let rules = [];
        const tslintConfig = ConfigHelper.get("tslint", { disable: false });
        if (!tslintConfig.disable) {
            rules.push({
                exclude: /node_modules/,
                test: /\.ts(x?)$/,
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
            exclude: /node_modules|\.d\.ts$/i,
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
                    loader: path.resolve(__dirname, "../libs/loaders/connect-default-param-loader"),
                    options: {
                        IS_SERVER_RUNTIME: true,
                    }
                },
            ],
        });
        rules.push({
            test: /\/pageRouters\//,
            use: [
                {
                    loader: path.resolve(__dirname, "../libs/loaders/router-loadable-loader"),
                    options: {
                        IS_SERVER_RUNTIME: true,
                    }
                },
            ],
        });
        rules.push({
            test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)(\?.*)?$/i,
            type: "asset",
            generator: {
                filename: path.resolve(
                    this.globalConfig.clientOutput,
                    "assets/[name]_[contenthash][ext][query]",
                ),
            },
        });
        rules.push({
            test: /\.css$/i,
            use: [
                // {
                //     loader: "isomorphic-style-loader",
                // },
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
                            exportOnlyLocals: true
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
                // {
                //     loader: "isomorphic-style-loader",
                // },
                {
                    loader: "css-loader",
                    options: {
                        importLoaders: 2,
                        sourceMap,
                        // modules: true,
                        modules: {
                            auto: this.shouldSourceModuled,
                            localIdentName: localIdentName,
                            namedExport: true,
                            exportOnlyLocals: true
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
        return rules;
    }

    protected async done(): Promise<void> {
        console.log(green(`${cyan(this.taskName)}, success`));
        this.appendCompileDoneCallback(async (): Promise<void> => {
            if (this.autoRun === true && this.isDebugMode === true) {
                if (this.debugPort < 1) {
                    return;
                }
                let serverEntry = "index";
                await RunServer(serverEntry, this.debugPort);
            }
        });
    }

    public setAutoRun(autoRun: boolean = true): ServerPack {
        this.autoRun = autoRun;
        this.debugPort = ConfigHelper.get("debugPort", 0);
        log.info("debugPort", this.debugPort);
        return this;
    }

    protected async compile(): Promise<void|Error> {
        log.info("->", cyan(this.taskName), HelperTask.taking());
        
        const mode = this.isDebugMode ? "development" : "production"; // this.isDebugMode ? JSON.stringify("development") : JSON.stringify("production");
        const defineOption = {
            IS_SERVER_RUNTIME: JSON.stringify(true),
            IS_DEBUG_MODE: JSON.stringify(!!this.isDebugMode),
        };
        const config: webpack.Configuration = {
            mode,
            // cache: false,
            devtool: this.isDebugMode ? "source-map" : undefined,
            entry: { "index": this.src },
            externals: [
                nodeExternals({
                    allowlist: [
                        /mizar/,
                    ],
                }) as any
            ],
            module: {
                parser: {
                    javascript: {
                        commonjsMagicComments: true,
                    },
                },
                rules: this.getRules(),
            },
            name: this.taskName,
            output: {
                filename: "[name].js",
                path: this.dist,
                library: {
                    type: "commonjs2",
                },
            },
            plugins: [
                new webpack.DefinePlugin(defineOption),
            ],
            resolve: {
                extensions: [".ts", ".tsx", ".js", ".css", ".png", ".jpg", ".gif", ".less", "sass", "scss", "..."],
                modules: [
                    path.resolve(__dirname, "src"),
                    "node_modules",
                ],
            },
            externalsPresets: {
                node: true,
            },
            target: "node",
            optimization: {
                emitOnErrors: false
            },
        };
        log.info("ServerPack.pack", { config: JSON.stringify(config) });
        await super.compile(config);
    }
}

export default ServerPack;
