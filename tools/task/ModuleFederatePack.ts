import fs from "fs-extra";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "path";
import { 
    container,
    DefinePlugin,
    type Compiler,
    type Configuration,
    type WebpackPluginInstance
} from "webpack";
import FederationModuleIdPlugin from "webpack-federation-module-id-plugin";
import { merge } from "webpack-merge";
import clientBase from "../config/client.base";
import getGlobalConfig, { type IGlobalConfig } from "../libs/getGlobalConfig";
import { ConfigHelper } from "../libs/ConfigHelper";
import Logger from "../libs/Logger";
import FederationStatsPlugin from "../libs/plugins/federation-stats-plugin";
import { WebpackTaskBase } from "../libs/WebpackTaskBase";
import { HelperTask } from "./HelperTask";

const log = Logger("ModuleFederatePack");

export class ModuleFederatePack extends WebpackTaskBase {
    private clientEntrySrc = "src/isomorphic/index";
    private globalConfig: IGlobalConfig;

    constructor(taskName = "ModuleFederatePack") {
        super(taskName);
        this.globalConfig = getGlobalConfig();
        this.src = path.resolve(`${this.rootPath}${this.clientEntrySrc}`);
        this.dist = path.resolve(`${this.rootPath}${this.globalConfig.clientOutput}/federate`);
    }

    protected async compile(): Promise<void|Error> {
        log.info("->", "ModuleFederatePack", HelperTask.taking());
        const config: Configuration = this.getCompileConfig();
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
        plugins.push(new DefinePlugin(defineOption));

        // if (this.isDebugMode) {
        //     plugins.push(new webpack.HotModuleReplacementPlugin());
        // }
        const moduleFederationConfig = ConfigHelper.get("federation", false);
        if (moduleFederationConfig && moduleFederationConfig.exposes) {
            plugins.push(new FederationStatsPlugin());
            plugins.push(new FederationModuleIdPlugin());
            plugins.push(new container.ModuleFederationPlugin(Object.assign({
                filename: "remoteEntry.js",
                name: ConfigHelper.getPackageName(),
            }, moduleFederationConfig)));
        }
        return plugins;
    }

    protected getCompileConfig(): Configuration  {
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
            const cuzConf: () => Configuration = require(cuzConfigPath);
            if (typeof cuzConf === "function") {
                return merge(innerConf, cuzConf());
            }
        }
        return innerConf;
    }
}

export default ModuleFederatePack;
