import fs from "fs-extra";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "path";
import webpack, {
    type Compiler,
    type Configuration,
    type WebpackPluginInstance
} from "webpack";
import FederationModuleIdPlugin from "webpack-federation-module-id-plugin";
import { merge } from "webpack-merge";
import clientBase from "../config/client.base.js";
import getGlobalConfig, { type IGlobalConfig } from "../libs/getGlobalConfig.js";
import ConfigHelper from "../libs/ConfigHelper.js";
import Logger from "../libs/Logger.js";
import FederationStatsPlugin from "../libs/plugins/federation-stats-plugin/index.js";
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
        const config: Configuration = await this.getCompileConfig();
        log.info("pack", { config: JSON.stringify(config) });
        try {
            await super.compile(config);
        } catch (e) {}
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
            plugins.push(new FederationStatsPlugin());
            plugins.push(new FederationModuleIdPlugin());
            plugins.push(new webpack.container.ModuleFederationPlugin(Object.assign({
                filename: "remoteEntry.js",
                name: ConfigHelper.getPackageName(),
            }, moduleFederationConfig)));
        }
        return plugins;
    }

    protected async getCompileConfig(): Promise<Configuration>  {
        const innerConf = merge(clientBase(this.isDebugMode), {
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
        });
        
        const cuzConfigPath = path.resolve("./webpack.config/mf.js");
        if (fs.existsSync(cuzConfigPath)) {
            const cuzConf: (conf: Configuration) => Configuration = (await import(cuzConfigPath)).default;
            if (typeof cuzConf === "function") {
                return merge(innerConf, cuzConf(innerConf));
            }
        }
        return innerConf;
    }
}

export default ModuleFederatePack;
