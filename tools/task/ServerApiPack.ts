import { green } from "colorette";
import * as fs from "fs-extra";
import * as  klaw from "klaw";
import * as Path from "path";
import * as webpack from "webpack";
import * as nodeExternals from "webpack-node-externals";
import getGlobalConfig, { IGlobalConfig, devLocalIdentName, prodLocalIdentName } from "../getGlobalConfig";
import { ConfigHelper } from "../libs/ConfigHelper";
import { WebpackTaskBase } from "../libs/WebpackTaskBase";
import { HelperTask } from "./HelperTask";
import Logger from "../libs/Logger";
const log = Logger("ServerApiPack");

export class ServerApiPack extends WebpackTaskBase {
    private globalConfig: IGlobalConfig;
    private tslintConfig;
    private cssModule;
    private apiSrc: string = "src/server/apis";
    private autoRun: boolean = false;
    private debug: number = 0;
    public constructor() {
        super("ServerApiPack");
        this.taskName = "ServerApiPack";
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

    public async scan() {
        return new Promise(resolve => {
            const entry = {};
            const entryDir = this.rootPath + this.apiSrc;
            if (!fs.existsSync(entryDir)) {
                log.warn("isomorphic pack build入口目录不存在：", entryDir);
                resolve({});
                return;
            }
            const walk = klaw(entryDir);
            walk.on("data", (state) => {
                const src = state.path;
                if (/\.ts?/.test(src)) {
                    const dirName = src.replace(Path.resolve(this.rootPath), "")
                        .replace(".tsx", "")
                        .replace(".ts", "")
                        .replace(/\\/g, "/")
                        .replace("/" + this.apiSrc + "/", "");
                    entry["apis/" + dirName] = src;
                }
            });
            walk.on("end", () => {
                log.debug(this.taskName, "scan.done", Path.resolve(this.rootPath));
                log.debug(this.taskName, "pack.keys", Object.keys(entry).join(","));
                resolve(entry);
            });
        });
    }
    public async run() {
        this.globalConfig = getGlobalConfig();
        this.tslintConfig = ConfigHelper.get("tslint", { disable: false });
        this.cssModule = ConfigHelper.get("serverPack.cssModule", true);
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
        
        const mode = this.watchModel ? "development" : "production";
        // const NODE_ENV = this.watchModel ? JSON.stringify("development") : JSON.stringify("production");
        const defineOption = {
            // "process.env.NODE_ENV": JSON.stringify(mode),
            // "process.env.RUNTIME_ENV": JSON.stringify("client"),
            // "process.env.IS_SERVER_ENV": JSON.stringify(false),
            "process.env.IS_DEBUG_MODE": JSON.stringify(!!this.watchModel),
        };
        const config: webpack.Configuration = {
            mode,
            // cache: true,
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
                libraryTarget: "commonjs2",
                path: Path.resolve(`${this.rootPath}${this.globalConfig.rootOutput}`),
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
            // externalsPresets: { node: true },
            // target: "node",
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
