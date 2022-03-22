import { cyan, green } from "colorette";
import ESLintWebpackPlugin from "eslint-webpack-plugin";
import fs from "fs-extra";
import path from "path";
import webpack, {
    type Compiler,
    type Configuration,
    type RuleSetRule,
    type WebpackPluginInstance,
} from "webpack";
import { merge } from "webpack-merge";
import serverBase from "../config/server.base.js";
import getGlobalConfig, { type IGlobalConfig, devLocalIdentName, prodLocalIdentName } from "../libs/getGlobalConfig.js";
import ConfigHelper from "../libs/ConfigHelper.js";
import Logger from "../libs/Logger.js";
import { WebpackTaskBase } from "../libs/WebpackTaskBase.js";
import { HelperTask } from "./HelperTask.js";
import RunServer from "./RunServer.js";
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

    private getPlugins(): (
		| ((this: Compiler, compiler: Compiler) => void)
		| WebpackPluginInstance
	)[] {
        const defineOption = {
            IS_SERVER_RUNTIME: JSON.stringify(true),
            IS_DEBUG_MODE: JSON.stringify(!!this.isDebugMode),
            DEV_PROXY_CONFIG: JSON.stringify(ConfigHelper.get("proxy", false)),
        };
        const plugins = [];
        plugins.push(new webpack.DefinePlugin(defineOption));
        const esLintPluginConfig = ConfigHelper.get("eslint", {
            files: "./src",
            failOnError: !this.isDebugMode,
        });
        if (esLintPluginConfig) {
            plugins.push(new ESLintWebpackPlugin(esLintPluginConfig));
        }
        const moduleFederationConfig = ConfigHelper.get("federation", false);
        if (moduleFederationConfig && moduleFederationConfig.remotes) {
            plugins.push(new webpack.container.ModuleFederationPlugin({
                remotes: moduleFederationConfig.remotes,
            }));
        }
        return plugins;
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
        const tslintConfig = ConfigHelper.get("tslint", true);
        if (tslintConfig) {
            rules.push({
                exclude: /[\\/]node_modules[\\/]|\.d\.ts$/i,
                test: /\.ts(x?)$/i,
                enforce: "pre",
                loader: "tslint-loader",
                options: {
                    configFile: fs.existsSync(tslintPath) ? tslintPath : "",
                    tsConfigFile: fs.existsSync(tsConfigPath) ? tsConfigPath : "",
                },
            });
        }
        rules.push({
            exclude: /[\\/]node_modules[\\/]|\.d\.ts$/i,
            test: /\.tsx?$/i,
            use: [
                {
                    loader: "ts-loader",
                    options: Object.assign(
                        {
                            compilerOptions: {
                                declaration: false,
                            },
                        },
                        ConfigHelper.get("ts-loader", {}),
                    ),
                },
            ],
        });
        rules.push({
            exclude: /\.d\.ts$/i,
            test: /[\\/]src[\\/]isomorphic[\\/].+[\\/][A-Z][^\\/]+[\\/]index\.tsx?$/,
            loader: "alcor-loaders/connect-default-param-loader",
        });
        rules.push({
            test: /\.css$/i,
            use: [
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
            test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)(\?.*)?$/i,
            type: "asset",
            generator: {
                filename: path.resolve(
                    this.globalConfig.clientOutput,
                    "assets/[name]_[contenthash][ext][query]",
                ),
            },
        });
        return rules;
    }

    protected async done(): Promise<void> {
        console.log(green(`${cyan(this.taskName)}, success`));
        this.compileFinishedCallback(async (): Promise<void> => {
            if (this.autoRun === true && this.isDebugMode === true) {
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
        const config: Configuration = await this.getCompileConfig();
        log.info("ServerPack.pack", { config: JSON.stringify(config) });
        await super.compile(config);
    }

    protected async getCompileConfig(): Promise<Configuration>  {
        const innerConf = merge(serverBase(this.isDebugMode), {
            entry: { "index": this.src, },
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
                path: this.dist,
            },
            plugins: this.getPlugins(),
        });
        const cuzConfigPath = path.resolve("./webpack.config/server.js");
        if (fs.existsSync(cuzConfigPath)) {
            const cuzConf: (conf: Configuration) => Configuration = (await import(cuzConfigPath)).default;
            if (typeof cuzConf === "function") {
                return merge(innerConf, cuzConf(innerConf));
            }
        }
        return innerConf;
    }
}

export default ServerPack;
