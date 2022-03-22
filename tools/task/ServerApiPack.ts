import { cyan, green, red } from "colorette";
import fs from "fs-extra";
import klaw from "klaw";
import path from "path";
import webpack, { type Configuration, type EntryObject, } from "webpack";
import { merge } from "webpack-merge";
import serverBase from "../config/server.base.js";
import getGlobalConfig, { type IGlobalConfig, devLocalIdentName, prodLocalIdentName } from "../libs/getGlobalConfig.js";
import ConfigHelper from "../libs/ConfigHelper.js";
import { WebpackTaskBase } from "../libs/WebpackTaskBase.js";
import { HelperTask } from "./HelperTask.js";
import Logger from "../libs/Logger.js";
const log = Logger("ServerApiPack");

export class ServerApiPack extends WebpackTaskBase {
    private globalConfig: IGlobalConfig;

    constructor(taskName = "ServerApiPack") {
        super(taskName);
        this.globalConfig = getGlobalConfig();
        this.src = path.resolve("./src/server/apis");
        this.dist = path.resolve(`${this.globalConfig.rootOutput}`);
    }

    private async scan(): Promise<EntryObject> {
        return new Promise((resolve, reject) => {
            const entry = {};
            if (!fs.existsSync(this.src)) {
                log.warn("ServerApiPack pack build 入口目录不存在：", this.src);
                resolve({});
                return;
            }
            const walk = klaw(this.src);
            walk.on("data", (state) => {
                const src = state.path;
                if (/\.ts?/.test(src)) {
                    const dirName = src.replace(this.src + "/", "")
                        .replace(".tsx", "")
                        .replace(".ts", "")
                        .replace(/\\/g, "/");
                    entry["apis/" + dirName] = src;
                }
            });
            walk.on("end", () => {
                log.info(cyan(this.taskName), "scan done ; pack.keys", Object.keys(entry).join(","));
                resolve(entry);
            });
            walk.on("error", e => {
                log.error(red("scan entry cause an error: "));
                log.error(e);
                reject(e);
            });
        });
    }

    protected async compile(): Promise<void|Error> {
        log.info("->", cyan(this.taskName), HelperTask.taking());
        
        let entry: EntryObject;
        try {
            entry = await this.scan();
        } catch (e) {}
        if (!entry || Object.keys(entry).length === 0) {
            log.warn(cyan(this.taskName), " scan emtpy entry");
            return;
        }
        log.info(cyan(this.taskName), "run.entry", entry);

        const config: Configuration = await this.getCompileConfig(entry);
        log.info("ServerApiPack.pack", { config: JSON.stringify(config) });
        await super.compile(config);
    }
    
    protected async getCompileConfig(entry: EntryObject): Promise<Configuration> {
        const tslintPath = path.resolve(`${this.rootPath}tslint.json`);
        const tsConfigPath = path.resolve(`${this.rootPath}tsconfig.json`);
        let localIdentName = prodLocalIdentName;
        let sourceMap = false;
        if (this.isDebugMode) {
            localIdentName = devLocalIdentName;
            sourceMap = true;
        }
        const rules = [];
        const tslintConfig = ConfigHelper.get("tslint", true);
        if (tslintConfig) {
            rules.push({
                exclude: /node_modules|\.d\.ts$/i,
                test: /\.ts(x?)$/,
                enforce: "pre",
                loader: "tslint-loader",
                options: {
                    configFile: fs.existsSync(tslintPath) ? tslintPath : "",
                    tsConfigFile: fs.existsSync(tsConfigPath) ? tsConfigPath : "",
                },
            });
        }

        const defineOption = {
            IS_SERVER_RUNTIME: JSON.stringify(true),
            IS_DEBUG_MODE: JSON.stringify(!!this.isDebugMode),
        };

        const innerConf = merge(serverBase(this.isDebugMode), {
            entry,
            module: {
                rules: rules.concat([
                    {
                        test: /\.tsx?$/,
                        exclude: /[\\/]node_modules[\\/]|\.d\.ts$/i,
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
                    },
                ]),
            },
            name: this.taskName,
            output: {
                path: this.dist,
            },
            plugins: [
                new webpack.DefinePlugin(defineOption),
            ],
        });

        const cuzConfigPath = path.resolve("./webpack.config/api.js");
        if (fs.existsSync(cuzConfigPath)) {
            const cuzConf: (conf: Configuration) => Configuration = (await import(cuzConfigPath)).default;
            if (typeof cuzConf === "function") {
                return merge(innerConf, cuzConf(innerConf));
            }
        }
        return innerConf;
    }
}

export default ServerApiPack;
