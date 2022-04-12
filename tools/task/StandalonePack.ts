import { cyan, yellow } from "colorette";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import fs from "fs-extra";
import klaw from "klaw";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "path";
import TerserJSPlugin from "terser-webpack-plugin";
import {
    type Configuration,
    type EntryObject,
} from "webpack";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import sharePlugin from "../config/share.plugin.js";
import { type webpackPluginsType } from "../interface.js";
import ConfigHelper from "../libs/ConfigHelper.js";
import getGlobalConfig, { type IGlobalConfig } from "../libs/getGlobalConfig.js";
import Logger from "../libs/Logger.js";
import { checkIsLegalIdentifier } from "../libs/Utils.js";
import { WebpackTaskBase } from "../libs/WebpackTaskBase.js";
import { HelperTask } from "./HelperTask.js";

export interface IPartialConf {
    entry: EntryObject;
    output: {
        filename: string;
        path: string;
        assetModuleFilename: string;
        library?: unknown;
    };
}

const log = Logger("StandalonePack");

const esDepends = [
    "core-js/features/object",
    "core-js/features/array",
    "core-js/features/map",
    "core-js/features/set",
    "core-js/features/promise",
    "raf/polyfill",
];

export class StandalonePack extends WebpackTaskBase {
    private globalConfig: IGlobalConfig;

    constructor(taskName = "StandalonePack") {
        super(taskName);
        this.globalConfig = getGlobalConfig();
        this.src = path.resolve("./src/standalone");
        this.dist = path.resolve(`${this.rootPath}${this.globalConfig.staticOutput}/standalone`);
    }

    private scan(): Promise<EntryObject> {
        return new Promise((resolve, reject) => {
            const dependOn = esDepends.concat(["react", "react-dom"]);
            const entries: EntryObject = {
                "polyfill-react": {
                    import: dependOn,
                },
            };
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
                    entries[entryKey.slice(1)] = {
                        import: src,
                        dependOn: "polyfill-react",
                    };
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

    private getPlugins(): webpackPluginsType {
        const plugins: webpackPluginsType = [];
        plugins.push(new MiniCssExtractPlugin({
            filename: "[name].css",
            // chunkFilename: "[name]-chunk-[id]_[contenthash:8].css",
        }));
        plugins.push(...sharePlugin.remoteMfPlugin);
        if (this.isAnalyzMode) {
            plugins.push(new BundleAnalyzerPlugin({
                analyzerMode: this.isDebugMode ? "server" : "disabled",
                generateStatsFile: !this.isDebugMode,
                openAnalyzer: !!this.isDebugMode,
            }));
        }
        return plugins;
    }

    private getEntryAndOutputConfig(entry): IPartialConf {
        const config = ConfigHelper.get("standalone", false);
        const returnedConfig: IPartialConf = {
            entry: {
                ...entry,
            },
            output: {
                filename: "[name].js",
                path: this.dist,
                assetModuleFilename: "assets/[name][ext][query]",
            },
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
            const pkgName = ConfigHelper.getPackageName();
            if (!checkIsLegalIdentifier(pkgName)) {
                throw new Error(`the value of 'name' field in package.json can't be a illegal js identifier when set 'standalone' field to true in ./config/configure.json `);
            }
            returnedConfig.output.library = {
                name: ConfigHelper.getPackageName(),
                type: "assign",
            };
        } else if (typeof config === "object") {
            // 进行简单判断，typeof是object就认为是对象
            const entryKeys = Object.keys(entry);
            for (let i = 0, len = entryKeys.length; i < len; i++) {
                const key = entryKeys[i];
                if (key in config) {
                    if (!checkIsLegalIdentifier(config[key]["name"])) {
                        throw new Error(`the value of 'standalone["${key}"]["name"]' field should be a legal js identifier in ./config/configure.json `)
                    }
                    // 说明自动获取的standalone entry文件在手动配置的config中存在，则替换entry的配置
                    // 暂时配置中不支持配置一个entry入口有多个文件，自动获取的entry[key]指定单个文件
                    (returnedConfig.entry[key] as any).library = config[key];
                }
            }
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
        const config: Configuration = {
            ...this.getEntryAndOutputConfig(entry),
            externals: this.getExternalConfig(),
            name: this.taskName,
            plugins: this.getPlugins(),
            optimization: {
                splitChunks: false,
                ...this.getOptimization(),
            },
        };
        log.info(cyan(this.taskName), "pack", config);
        await super.compile(config);
    }
}
export default StandalonePack;