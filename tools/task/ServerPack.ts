import { cyan, green } from "colorette";
import fs from "fs-extra";
import path from "path";
import { type Configuration } from "webpack";
import { merge } from "webpack-merge";
import serverBase from "../config/server.base.js";
import sharePlugin from "../config/share.plugin.js";
import {
    type webpackPluginsType,
    type webpackRulesType,
} from "../interface.js";
import getGlobalConfig, { assetModuleFilename, type IGlobalConfig, devLocalIdentName, prodLocalIdentName } from "../libs/getGlobalConfig.js";
import { shouldSourceModuled, } from "../libs/Utils.js";
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

    private getPlugins(): webpackPluginsType {
        const plugins: webpackPluginsType = [];
        plugins.push(...sharePlugin.remoteMfPlugin);
        return plugins;
    }
    
    private getCssLoaders(isDebugMode: boolean, extraLoaders = []): webpackRulesType {
        const loaders: webpackRulesType = [];
        let localIdentName = prodLocalIdentName;
        let sourceMap = false;
        if (isDebugMode) {
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
                        auto: shouldSourceModuled,
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
        ], extraLoaders);
    }

    private getRules(isDebugMode: boolean): webpackRulesType  {
        let rules: webpackRulesType = [];
        rules.push({
            exclude: /\.d\.ts$/i,
            test: /[\\/]src[\\/]isomorphic[\\/].+[\\/][A-Z][^\\/]+[\\/]index\.tsx?$/,
            loader: "alcor-loaders/connect-default-param-loader",
        });
        rules.push({
            test: /\.css$/i,
            use: this.getCssLoaders(isDebugMode),
            type: "javascript/auto",
        });
        rules.push({
            test: /\.less$/i,
            use: this.getCssLoaders(isDebugMode, [
                {
                    loader: "less-loader",
                    options: Object.assign(
                            {
                            sourceMap: isDebugMode,
                        },
                        ConfigHelper.get("less-loader", {}),
                    ),
                },
            ]),
            type: "javascript/auto",
        });
        rules.push({
            test: /\.s[ac]ss$/i,
            use: this.getCssLoaders(isDebugMode, [
                {
                    loader: "sass-loader",
                    options: Object.assign(
                        {
                            sourceMap: isDebugMode,
                        },
                        ConfigHelper.get("sass-loader", {}),
                    ),
                },
            ]),
            type: "javascript/auto",
        });
        rules.push({
            test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)(\?.*)?$/i,
            type: "asset",
            generator: {
                filename: path.resolve(
                    getGlobalConfig().clientOutput,
                    assetModuleFilename,
                ),
            },
        });
        return rules;
    }

    protected async done(): Promise<void> {
        console.log(green(`${cyan(this.taskName)} task completed.\n`));
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
                rules: this.getRules(this.isDebugMode),
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
