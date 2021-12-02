import { green } from "colorette";
import fs from "fs-extra";
import Path from "path";
import webpack from "webpack";
import nodeExternals from "webpack-node-externals";
import getGlobalConfig, { IGlobalConfig, devLocalIdentName, prodLocalIdentName } from "../getGlobalConfig";
import { ConfigHelper } from "../libs/ConfigHelper";
import { WebpackTaskBase } from "../libs/WebpackTaskBase";
import { HelperTask } from "./HelperTask";
import { RunServer } from "./RunServer";
import Logger from "../libs/Logger";
const log = Logger("ServerPack");

export class ServerPack extends WebpackTaskBase {
    private globalConfig: IGlobalConfig;
    private tslintConfig;
    private src: string = "src/server/index";
    private autoRun: boolean = false;
    private debug: number = 0;

    public constructor() {
        super("ServerPack");
        this.taskName = "ServerPack";
        this.shouldRestartDevServer = false;
    }
    public setAutoRun(autoRun: boolean = true) {
        this.autoRun = autoRun;
        this.debug = ConfigHelper.get("debugPort", 0);
        log.info("debugPort", this.debug);
        return this;
    }
    // public setWatchModel(watchModel: boolean) {
    //     this.watchModel = watchModel;
    //     return this;
    // }

    public async run() {
        this.globalConfig = getGlobalConfig();
        this.tslintConfig = ConfigHelper.get("tslint", { disable: false });
        log.info("->", this.taskName, HelperTask.taking());
        try {
            await this.pack({"index": Path.resolve(`${this.rootPath}${this.src}`)});
        } catch (e) {
            log.error(this.taskName, " run into an error: ", e);
        }
    }
    
    private shouldSourceModuled(resourcePath: string): boolean {
        // log.warn('!/node_modules/i.test(resourcePath): ', !/node_modules/i.test(resourcePath));
        // log.warn('/components?|pages?/i.test(resourcePath): ', /components?|pages?/i.test(resourcePath));
        return /components?|pages?/i.test(resourcePath);
    }
    
    private getStyleRuleLoaderOption(loaderName) {
        return ConfigHelper.get(loaderName, {});
    }

    public async pack(entry) {
        const tslintPath = Path.resolve(`${this.rootPath}tslint.json`);
        const tsConfigPath = Path.resolve(`${this.rootPath}tsconfig.json`);
        let localIdentName = prodLocalIdentName;
        let sourceMap = false;
        if (this.watchModel) {
            localIdentName = devLocalIdentName;
            sourceMap = true;
        }
        const rules = [];
        if (!this.tslintConfig.disable) {
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
            test: /\/src\/isomorphic\/.+\/index\.tsx?$/,
            use: [
                {
                    loader: Path.resolve(__dirname, "../libs/loaders/connect-default-param-loader"),
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
                    loader: Path.resolve(__dirname, "../libs/loaders/router-loadable-loader"),
                    options: {
                        IS_SERVER_RUNTIME: true,
                    }
                },
            ],
        });
        
        const mode = this.watchModel ? "development" : "production"; // this.watchModel ? JSON.stringify("development") : JSON.stringify("production");
        const defineOption = {
            IS_SERVER_RUNTIME: JSON.stringify(true),
            IS_DEBUG_MODE: JSON.stringify(!!this.watchModel),
        };
        const config: webpack.Configuration = {
            mode,
            // cache: false,
            devtool: this.watchModel ? "source-map" : undefined,
            entry,
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
                rules: rules.concat([
                    {
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
                    },
                    {
                        test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)(\?.*)?$/i,
                        type: "asset",
                        generator: {
                            filename: Path.resolve(
                                this.globalConfig.clientOutput,
                                "assets/[name]_[contenthash][ext][query]",
                            ),
                        },
                    },
                    {
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
                    },
                    {
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
                    },
                    {
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
                    },
                ]),
            },
            name: this.taskName,
            output: {
                filename: "[name].js",
                path: Path.resolve(`${this.globalConfig.rootOutput}`),
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
                    Path.resolve(__dirname, "src"),
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
        try {
            await this.compile(config);
        } catch (e) {
            log.error(this.taskName, " webpacking raised an error: ", e);
        }
    }
    protected async doneCallback() {
        console.log(green(`${this.taskName}, success`));
        if (this.autoRun === true && this.watchModel === true) {
            let serverEntry = "index";
            RunServer(serverEntry, this.debug);
        }
    }
}

export default ServerPack;
