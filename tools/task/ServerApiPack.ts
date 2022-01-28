import { green } from "colorette";
import fs from "fs-extra";
import klaw from "klaw";
import path from "path";
import webpack from "webpack";
import nodeExternals from "webpack-node-externals";
import getGlobalConfig, { IGlobalConfig, devLocalIdentName, prodLocalIdentName } from "../getGlobalConfig";
import { ConfigHelper } from "../libs/ConfigHelper";
import { WebpackTaskBase } from "../libs/WebpackTaskBase";
import { HelperTask } from "./HelperTask";
import Logger from "../libs/Logger";
const log = Logger("ServerApiPack");

export class ServerApiPack extends WebpackTaskBase {
    private globalConfig: IGlobalConfig;
    private tslintConfig;

    constructor(taskName = "ServerApiPack") {
        super(taskName);
        this.globalConfig = getGlobalConfig();
        this.src = path.resolve("./src/server/apis");
        this.dist = path.resolve(`${this.globalConfig.rootOutput}`);
    }

    public async scan(): Promise<object> {
        return new Promise(resolve => {
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
                log.debug(this.taskName, "scan.done", path.resolve(this.rootPath));
                log.debug(this.taskName, "pack.keys", Object.keys(entry).join(","));
                resolve(entry);
            });
        });
    }

    public async run(): Promise<void|Error> {
        this.tslintConfig = ConfigHelper.get("tslint", { disable: false });
        log.info("->", this.taskName, HelperTask.taking());
        try {
            const entry = await this.scan();
            if (!entry || Object.keys(entry).length === 0) {
                log.warn(this.taskName, " scan emtpy entry");
                return;
            }
            log.debug(this.taskName, "run.entry", entry);
            await this.pack(entry);
        } catch (e) {
            log.error(this.taskName, " run into an error: ", e);
        }
    }

    public async pack(entry): Promise<void|Error> {
        const tslintPath = path.resolve(`${this.rootPath}tslint.json`);
        const tsConfigPath = path.resolve(`${this.rootPath}tsconfig.json`);
        let localIdentName = prodLocalIdentName;
        let sourceMap = false;
        if (this.isDebugMode) {
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
        
        const mode = this.isDebugMode ? "development" : "production";
        // const NODE_ENV = this.isDebugMode ? JSON.stringify("development") : JSON.stringify("production");
        const defineOption = {
            IS_SERVER_RUNTIME: JSON.stringify(true),
            IS_DEBUG_MODE: JSON.stringify(!!this.isDebugMode),
        };
        const config: webpack.Configuration = {
            mode,
            // cache: true,
            devtool: this.isDebugMode ? "source-map" : undefined,
            entry,
            externals: [
                nodeExternals({
                    allowlist: [
                        /mizar/,
                    ],
                }) as any
            ],
            module: {
                rules: rules.concat([
                    {
                        test: /\.tsx?$/,
                        exclude: /node_modules|\.d\.ts$/,
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
                ]),
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
        log.info("ServerApiPack.pack", { config: JSON.stringify(config) });
        try {
            await this.compile(config);
        } catch (e) {
            log.error(this.taskName, " webpacking raised an error: ", e);
        }
    }
}

export default ServerApiPack;
