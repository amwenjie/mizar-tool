import { green, red, yellow } from "colorette";
import * as yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as webpack from "webpack";
import Logger from "./Logger";
import TaskBase from "./TaskBase";

const argv: any = yargs(hideBin(process.argv)).argv;

const log = Logger("WebpackTaskBase");

export class WebpackTaskBase extends TaskBase {
    protected shouldRestartDevServer = true;
    protected taskName = "WebpackTaskBase";
    constructor(name) {
        super(name);
        this.taskName = name;
    }

    private compileInvalid(fileName, changeTime) {
        const context = WebpackTaskBase.compileQueue[this.index];
        if (context) {
            context.state = false;
            context.callback = null;
            WebpackTaskBase.changedQueue.push(context.shouldRestartDevServer);
            log.info(`${this.taskName}, file change: ${fileName}`);
        }
    }
    
    private compileWatchRun() {
        const context = WebpackTaskBase.compileQueue[this.index];
        if (context) {
            context.state = false;
            context.callback = this.doneCallback.bind(this);
        }
    }

    private compileDone(status) {
        const context = WebpackTaskBase.compileQueue[this.index];
        if (context) {
            context.state = true;
        }
    }

    private shouldDoneCallbackExec() {
        const beforeQueue = WebpackTaskBase.compileQueue.slice(0, this.index);
        return beforeQueue.every(context => {
            return context.state === true;
        });
    }

    private isAllCompileDone() {
        return WebpackTaskBase.compileQueue.every(context => {
            return context.state === true;
        });
    }

    protected async compile(config): Promise<string | Error> {
        return new Promise(async (resolve, reject) => {
            const callback = (error, stats) => {
                if (this.done(error, stats)) {
                    if (this.isAllCompileDone()) {
                        WebpackTaskBase.compileQueue.forEach(async (context) => {
                            if (typeof context.callback === "function") {
                                await context.callback(); // .call(context.context);
                                context.callback = null;
                            }
                        });
                        if (!WebpackTaskBase.changedQueue.some(runServer => runServer === false)) {
                            const task = WebpackTaskBase.compileQueue[WebpackTaskBase.compileQueue.length - 1].task;
                            task.doneCallback.call(task);
                        }
                        WebpackTaskBase.changedQueue = [];
                    }
                    resolve("succeess");
                } else {
                    reject(error);
                }
            };
            const compiler = webpack(config);
            WebpackTaskBase.compileQueue.push({
                state: false,
                task: this,
                shouldRestartDevServer: this.shouldRestartDevServer,
                callback: null,
            });
            this.index = WebpackTaskBase.compileQueue.length - 1;
            // this.compileContext.compiler = compiler;
            compiler.hooks.invalid.tap("alcor-webpack-task-base", (fileName, changeTime) => {
                // log.info("++++++", this.taskName, "invalid");
                this.compileInvalid(fileName, changeTime);
            });
            compiler.hooks.watchRun.tap("alcor-webpack-task-base", () => {
                // log.info("++++++", this.taskName, "watchRun");
                this.compileWatchRun();
            });
            compiler.hooks.done.tap('alcor-webpack-task-base', stats => {
                // log.info("++++++", this.taskName, "done");
                this.compileDone(stats);
            });
            // compiler.hooks.failed.tap('alcor-webpack-task-base', error => {
            //     log.info("++++++", this.taskName, "failed", error);
            //     // this.compileDone(stats);
            // });
            // compiler.hooks.watchClose.tap('alcor-webpack-task-base', () => {
            //     log.info("++++++", this.taskName, "watchClose");
            //     // this.compileDone(stats);
            // });
            if (this.watchModel) {
                this.watcher = compiler.watch({}, callback);
            } else {
                compiler.run(async (error, stats) => {
                    await callback(error, stats);
                    compiler.close(error => {
                        if (error) {
                            log.error(this.taskName, " compile close error: ");
                            log.error(error);
                            return;
                        }
                        log.info(this.taskName, " compile closed.");
                    });
                });
            }
        });
    }

    protected done(webpackSelfError, stats) {
        try {
            if (webpackSelfError) {
                log.error(this.taskName, "> error:");
                log.error(webpackSelfError.stack || webpackSelfError);
                if (webpackSelfError.details) {
                    log.error(webpackSelfError.details);
                }
                this.helperTask.sendMessage(this.taskName, "webpack运行有错误");
                throw new Error(this.taskName + " 运行有错误");
            }
            const info = stats.toJson();
            // const errors = info.errors;
            // log.warn("共有错误数：", errors.length);
            // const warnings = info.warnings;
            // log.warn("共有警告数：", warnings.length);

            if (stats.hasErrors()) {
                // 有错误
                log.error(red(`${this.taskName} has errors: `));
                log.error(info.errors);
                // errors.forEach((error) => {
                //     log.error(`WebpackTaskBase ${this.taskName}  error : ${error}`);
                // });
                // const firstError = errors[0];
                this.helperTask.sendMessage(this.taskName, "代码有错误");
                // 非watch模式直接抛异常
                if (this.watchModel === false) {
                    const message = this.taskName + ".fail";
                    throw new Error(message);
                }
            }

            if (stats.hasWarnings()) {
                // 有警告
                if (this.watchModel === true) {
                    log.warn(yellow(`${this.taskName} has warnings: `));
                    log.warn(info.warnings);
                }
                // if (this.watchModel === true) {
                //     warnings.forEach((warning) => {
                //         log.warn(`WebpackTaskBase ${this.taskName} warning : ${warning}`);
                //     });
                // }
                // const firstWarning = warnings[0];
                this.helperTask.sendMessage(this.taskName, "代码有警告");
            }

            // 完成
            log.info(this.taskName + ".done", this.count);
            this.helperTask.sendMessage(this.taskName, "编译结束:" + this.count++);
            
            if (stats) {
                log.log(stats.toString({
                    chunks: false,  // Makes the build much quieter
                    colors: true    // Shows colors in the console
                }));
            }
            return true;
        } catch (e) {
            return false;
        }
    }
}
export default WebpackTaskBase;
