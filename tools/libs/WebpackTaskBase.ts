import { bold, cyan, red, white, yellow } from "colorette";
import fs from "fs-extra";
import path from "path";
import webpack, {
    type Compiler,
    type Configuration,
    type Stats,
    type WebpackError,
} from "webpack";
import { merge } from "webpack-merge";
import WebpackDevServer from "webpack-dev-server";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import clientBase from "../config/client.base.js";
import serverBase from "../config/server.base.js";
import HelperTask from "../task/HelperTask.js";

import Logger from "./Logger.js";
import TaskBase from "./TaskBase.js";

const log = Logger();
const argv = yargs(hideBin(process.argv)).argv as any;
const hooksName = "alcor-webpack-task-base";

const taskCuzConfFileNameMap = {
    "IsomorphicPack": "client",
    "ModuleFederatePack": "mf",
    "StandalonePack": "standalone",
    "ServerApiPack": "api",
    "ServerPack": "server",
}

export class WebpackTaskBase extends TaskBase {
    private helperTask: HelperTask;
    private static compileQueue = [];
    private static compileDoneCallback = [];
    protected index = 0;
    public isHotReload = false;

    constructor(taskName = "WebpackTaskBase") {
        super(taskName);
        this.helperTask = new HelperTask();
        this.index = WebpackTaskBase.compileQueue.length;
        WebpackTaskBase.compileQueue.push({
            state: false,
            hash: "",
        });
    }

    private compileInvalid(fileName, changeTime) {
        const context = WebpackTaskBase.compileQueue[this.index];
        if (context) {
            context.state = false;
            log.info(`${cyan(this.taskName)}, file change: ${fileName}`, Date.now());
        }
    }
    
    private compileWatchRun() {
        const context = WebpackTaskBase.compileQueue[this.index];
        if (context) {
            context.state = false;
        }
    }

    private async compileDone(stats: Stats): Promise<void> {
        const context = WebpackTaskBase.compileQueue[this.index];
        if (context) {
            await this.done();
            context.state = true;
            context.hash = stats.hash;
        }
    }

    private isAllCompileDone() {
        const result = WebpackTaskBase.compileQueue.every(context => context && context.state === true);
        return result;
    }
    
    private printCompileResult(stats: Stats): void {
        const info = stats.toJson();
        if (stats.hasErrors()) {
            // 有错误
            this.helperTask.sendMessage(this.taskName, `代码有${info.errors.length}个错误`);
            info.errors.forEach(error => {
                log.error([
                    error.moduleName ? white("\n" + error.moduleName) : "",
                    red("\n  " + error.message),
                ].join(""));
                log.info(error);
            });
            // 非watch模式直接抛异常
            if (this.isDebugMode === false) {
                const message = cyan(this.taskName) + ".fail";
                throw new Error(message);
            }
        }

        if (stats.hasWarnings()) {
            // 有警告
            if (this.isDebugMode === true) {
                const showWarnList = info.warnings.filter(warning => {
                    return !(
                        warning.moduleName
                        && /mizar\/server\/utils\/getApis\.js/.test(warning.moduleName)
                        && warning.message.indexOf('Critical dependency: the request of a dependency is an expression') > -1
                    );
                });
                showWarnList.forEach(warning => {
                    log.warn([
                        warning.moduleName ? white("\n" + warning.moduleName) : "",
                        yellow("\n  " + warning.message),
                    ].join(""));
                    log.info(warning);
                });
                (info.warnings.length - showWarnList.length) > 0 && this.helperTask.sendMessage(this.taskName, "代码有警告");
            }
        }

        // 完成
        this.helperTask.sendMessage(this.taskName, "编译结束:" + this.count++);

        if (stats) {
            log.info(stats.toString({
                chunks: argv.verbose,  
                colors: true 
            }));
        }
    }

    protected compileFinishedCallback(fn) {
        WebpackTaskBase.compileDoneCallback.push(fn);
    }
    
    protected getCompileConfig(config: Configuration): Configuration  {
        const innerConf = merge({}, (/server/i.test(this.taskName) ? serverBase : clientBase)(this.isDebugMode, this.isHotReload), config);
        return innerConf;
    }

    protected async compile(innerConf: webpack.Configuration): Promise<void|Error> {
        let finalConf = this.getCompileConfig(innerConf);
        const cuzConfigPath = path.resolve(`./webpack.config/${taskCuzConfFileNameMap[this.taskName]}.js`);
        if (fs.existsSync(cuzConfigPath)) {
            const cuzConf: (conf: Configuration) => Configuration = (await import(cuzConfigPath)).default;
            if (typeof cuzConf === "function") {
                finalConf = merge(innerConf, cuzConf(innerConf));
            }
        }
        log.info("compile", { config: JSON.stringify(finalConf) });
        return new Promise((resolve, reject) => {
            const compiler = webpack(finalConf);
            // this.compileContext.compiler = compiler;
            compiler.hooks.invalid.tap(hooksName, (fileName, changeTime) => {
                this.compileInvalid(fileName, changeTime);
            });
            compiler.hooks.watchRun.tapAsync(hooksName, (compiler, callback = () => {}) => {
                this.compileWatchRun();
                callback();
            });
            compiler.hooks.done.tapAsync(hooksName, async (stats: Stats, callback = () => {}) => {
                log.info(cyan(this.taskName), "done, newhash: ", stats.hash, " , oldhash: ", WebpackTaskBase.compileQueue[this.index].hash);
                // const prevHash = WebpackTaskBase.compileQueue[this.index].hash;
                // if (prevHash !== stats.hash) {
                await this.compileDone(stats);
                // } else {
                //     WebpackTaskBase.compileQueue[this.index].state = true;
                // }
                callback();
            });
            // compiler.hooks.failed.tap(hooksName, error => {
            //     log.info("++++++", cyan(this.taskName), "failed", error);
            //     // this.compileDone(stats);
            // });
            // compiler.hooks.watchClose.tap(hooksName, () => {
            //     log.info("++++++", cyan(this.taskName), "watchClose");
            //     // this.compileDone(stats);
            // });
            compiler.close(error => {
                if (error) {
                    log.error(red(`${cyan(this.taskName)} compile close error: `), error);
                    return;
                }
                log.info(cyan(this.taskName), " compile closed.");
            });

            if (this.taskName === "IsomorphicPack" && this.isHotReload) {
                const wds = new WebpackDevServer({
                    devMiddleware: {
                        stats: false,
                    },
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                    },
                    hot: true,
                    liveReload: true,
                    port: 9000,
                    static: "/static/client",
                    ...(finalConf.devServer || {})
                }, compiler);
                wds.start().then(resolve).catch(reject);
                return;
            }

            const compileCallback = async (error: WebpackError|null|undefined, stats: Stats): Promise<void> => {
                if (error) {
                    this.helperTask.sendMessage(this.taskName, "webpack执行出错");
                    log.error(cyan(this.taskName), ` > ${red(bold("webpack error:"))}`);
                    log.error(error.stack || error);
                    if (error.details) {
                        log.error(error.details);
                    }
                    reject(error);
                    throw new Error(cyan(this.taskName) + " 运行有错误");
                }
                this.printCompileResult(stats);
                if (this.isAllCompileDone()) {
                    while (WebpackTaskBase.compileDoneCallback.length) {
                        await WebpackTaskBase.compileDoneCallback.shift()();
                    }
                }
                resolve();
            };

            if (this.isWatchMode) {
                this.watcher = compiler.watch({
                    ignored: /[\\/]node_modules[\\/]|[\\/]dist[\\/]|\.d\.ts$|\.js\.map$|\.css\.map$/i,
                    aggregateTimeout: 600,
                }, compileCallback);
            } else {
                compiler.run(async (error?: WebpackError, stats?: Stats): Promise<void> => {
                    compileCallback(error, stats);
                });
            }
        });
    }

    protected getEnvDef(): "development"|"production" {
        return this.isDebugMode ? "development" : "production";
    }
}

export default WebpackTaskBase;
