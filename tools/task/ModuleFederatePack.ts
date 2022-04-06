import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "path";
import { type Configuration } from "webpack";
import sharePlugin from "../config/share.plugin.js";
import { type webpackPluginsType } from "../interface.js";
import getGlobalConfig, { type IGlobalConfig } from "../libs/getGlobalConfig.js";
import Logger from "../libs/Logger.js";
import { WebpackTaskBase } from "../libs/WebpackTaskBase.js";
import { HelperTask } from "./HelperTask.js";

const log = Logger("ModuleFederatePack");

export class ModuleFederatePack extends WebpackTaskBase {
    private globalConfig: IGlobalConfig;

    constructor(taskName = "ModuleFederatePack") {
        super(taskName);
        this.globalConfig = getGlobalConfig();
        this.dist = path.resolve(`${this.rootPath}${this.globalConfig.clientOutput}/federate`);
    }

    protected async compile(): Promise<void|Error> {
        log.info("->", "ModuleFederatePack", HelperTask.taking());
        const config: Configuration = {
            entry: { "index": ["raf/polyfill"], },
            output: {
                publicPath: "auto",
                path: this.dist,
            },
            name: this.taskName,
            plugins: this.getPlugins(),
            optimization: {
                splitChunks: false,
            },
        };
        log.info("pack", { config: JSON.stringify(config) });
        await super.compile(config);
    }

    private getPlugins(): webpackPluginsType {
        const plugins: webpackPluginsType = [];
        plugins.push(new MiniCssExtractPlugin({
            filename: "[name]_[contenthash:8].css",
            // chunkFilename: "[name]-chunk-[id]_[contenthash:8].css",
        }));
        // if (this.isDebugMode) {
        //     plugins.push(new webpack.HotModuleReplacementPlugin());
        // }
        plugins.push(...sharePlugin.exposeMfPlugin);
        return plugins;
    }
}

export default ModuleFederatePack;
