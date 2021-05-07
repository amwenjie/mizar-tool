import { green } from "colorette";
import * as fs from "fs-extra";
import * as  klaw from "klaw";
import * as Path from "path";
import * as webpack from "webpack";
import * as nodeExternals from "webpack-node-externals";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import getGlobalConfig, { IGlobalConfig, devLocalIdentName, prodLocalIdentName } from "../getGlobalConfig";
import { ConfigHelper } from "../libs/ConfigHelper";
import { WebpackTaskBase } from "../libs/WebpackTaskBase";
import { HelperTask } from "./HelperTask";
import { RunServer } from "./RunServer";
import Logger from "../libs/Logger";
const argv = yargs(hideBin(process.argv)).argv;

let logCtg;
if (argv.verbose) {
    logCtg = "all";
} else if (argv.debug) {
    logCtg = "debug";
}
const log = Logger(logCtg);

export class ServerPack extends WebpackTaskBase {
    private globalConfig: IGlobalConfig;
    private tslintConfig;
    private cssModule;
    private rootPath: string = Path.normalize("./");
    private src: string = "src/server/index";
    private autoRun: boolean = false;
    private debug: number = 0;
    private argv = null;
    public constructor() {
        super();
        this.taskName = "ServerPack";
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
        return new Promise((resolve) => {
            const entry = {};
            const router = this.rootPath + this.src;
            const walk = klaw(router);
            walk.on("data", (state) => {
                const src = state.path;
                if (/\.ts?/.test(src)) {
                    const dirName = src.replace(Path.resolve(this.rootPath), "")
                        .replace(".tsx", "")
                        .replace(".ts", "")
                        .replace(/\\/g, "/")
                        .replace("/" + this.src, "");
                    entry[dirName] = src;
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
        log.debug(this.taskName, { "index": Path.resolve(`${this.rootPath}/${this.src}`) });
        try {
            await this.pack({ "index": Path.resolve(`${this.rootPath}/${this.src}`) });
        } catch (e) {
            log.error(this.taskName, " run into an error: ", e);
        }
    }
    
    private shouldSourceModuled(resourcePath: string): boolean {
        // log.warn('!/node_modules/i.test(resourcePath): ', !/node_modules/i.test(resourcePath));
        // log.warn('/components?|pages?/i.test(resourcePath): ', /components?|pages?/i.test(resourcePath));
        return /components?|pages?/i.test(resourcePath);
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
        const config: webpack.Configuration = {
            mode: this.watchModel ? "development" : "production",
            cache: true,
            devtool: "source-map",
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
                        exclude: /node_modules/,
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
                    {
                        test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)(\?.*)?$/,
                        type: "asset",
                        generator: {
                            filename: Path.resolve(
                                this.globalConfig.clientOutput,
                                "assets/[name]_[contenthash][ext][query]",
                            ),
                        },
                    },
                    {
                        test: /\.css$/,
                        use: [
                            // {
                            //     loader: "isomorphic-style-loader",
                            // },
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
                                options: {
                                    postcssOptions: () => {
                                        return {
                                            plugins: [
                                                require("precss"),
                                                require("autoprefixer"),
                                            ],
                                        };
                                    },
                                },
                            },
                        ],
                        type: "javascript/auto",
                    },
                    {
                        test: /\.less$/,
                        use: [
                            // {
                            //     loader: "isomorphic-style-loader",
                            // },
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
                                options: {
                                    postcssOptions: () => {
                                        return {
                                            plugins: [
                                                require("precss"),
                                                require("autoprefixer"),
                                            ],
                                        };
                                    },
                                },
                            },
                            {
                                loader: "less-loader",
                                options: {
                                    sourceMap,
                                },
                            },
                        ],
                        type: "javascript/auto",
                    },
                ]),
            },
            name: this.taskName,
            output: {
                filename: "[name].js",
                libraryTarget: "commonjs2",
                path: Path.resolve(`${this.rootPath}/${this.globalConfig.rootOutput}`),
            },
            resolve: {
                extensions: [".ts", ".tsx", ".js", ".png", ".jpg", ".gif", ".less"],
                modules: [
                    Path.resolve(`${this.rootPath}/node_modules`),
                ],
            },
            externalsPresets: { node: true },
            target: "node",
            optimization: {
                emitOnErrors: false
            },
        };

        if (this.watchModel === false) {
            config.devtool = undefined;
        }
        if (this.argv && this.argv.verbose) {
            log.info("ServerPack.pack", { config: JSON.stringify(config) });
        }
        try {
            await this.compile(config);
        } catch (e) {
            log.error(this.taskName, " webpacking raised an error: ", e);
        }
    }
    protected async doneCallback() {
        console.log(green(`${this.taskName}, success`));
        if (this.autoRun === true && this.watchModel === true) {
            // const pkgName = ConfigHelper.getPackageName();
            let serverEntry = "index";
            // if (pkgName) {
            //     serverEntry = `${pkgName}/index`;
            // }
            RunServer(serverEntry, this.debug);
        }
    }
}

export default ServerPack;
