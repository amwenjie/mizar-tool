import { cyan, green, red, yellow } from "colorette";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import ESLintWebpackPlugin from "eslint-webpack-plugin";
import fs from "fs-extra";
import klaw from "klaw";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "path";
import StylelintPlugin from "stylelint-webpack-plugin";
import TerserJSPlugin from "terser-webpack-plugin";
import webpack, {
    container,
    type Compiler,
    type Configuration,
    type EntryObject,
    type WebpackPluginInstance,
} from "webpack";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import { merge } from "webpack-merge";
import clientBase from "../config/client.base";
import getGlobalConfig, { type IGlobalConfig } from "../libs/getGlobalConfig";
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
        const entry: EntryObject = await this.scan();
        if (!entry || Object.keys(entry).length === 0) {
            log.warn(yellow(`${cyan(this.taskName)}, scan emtpy entry`));
            return;
        }
        log.info(cyan(this.taskName), "run.entry", entry);
        const config: Configuration = this.getCompileConfig(entry);
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
    private async scan(): Promise<EntryObject> {
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

    private getOptimization() {
        return {
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
        };
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
        const moduleFederationConfig = ConfigHelper.get("federation", false);
        if (moduleFederationConfig && moduleFederationConfig.remotes) {
            plugins.push(new container.ModuleFederationPlugin({
                remotes: moduleFederationConfig.remotes,
            }));
        }
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
        if (typeof config === "object" && !Array.isArray(config)) {
            return [config];
        } else if (Array.isArray(config)) {
            return config;
        }
        return [];
    }

    protected getCompileConfig(entry: EntryObject): Configuration  {
        const innerConf = merge(clientBase(this.isDebugMode), {
            ...this.getEntryAndOutputConfig(entry),
            externals: this.getExternalConfig(),
            name: this.taskName,
            plugins: this.getPlugins(),
            optimization: this.getOptimization(),
        });
        
        const cuzConfigPath = path.resolve("./webpack.config/standalone.js");
        if (fs.existsSync(cuzConfigPath)) {
            const cuzConf: () => Configuration = require(cuzConfigPath);
            if (typeof cuzConf === "function") {
                return merge(innerConf, cuzConf());
            }
        }
        return innerConf;
    }
}
export default StandalonePack;