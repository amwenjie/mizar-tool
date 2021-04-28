import * as yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as Path from "path";
import * as webpack from "webpack";
import { HelperTask } from "../task/HelperTask";
import Logger from "./Logger";

const argv: any = yargs(hideBin(process.argv)).argv;

let logCtg;
if (argv.verbose) {
    logCtg = "all";
} else if (argv.debug) {
    logCtg = "debug";
}
const log = Logger(logCtg);

export class WebpackTaskBase {
    private static compileQueue = [];
    private watcher;
    private index: number;
    public taskName = "WebpackTaskBase";
    public watchModel = false;
    public count = 1;
    public helperTask = new HelperTask();
    public projectRoot = Path.resolve(".");

    private compileInvalid() {
        const context = WebpackTaskBase.compileQueue[this.index];
        if (context) {
            context.state = false;
            context.callback = null;
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

    public setTaskName(taskName: string) {
        this.taskName = taskName;
    }

    public setWatchModel(watchModel) {
        this.watchModel = watchModel;
        return this;
    }

    protected async compile(config) {
        return new Promise(async (resolve, reject) => {
            const callback = async (error, stats) => {
                try {
                    // log.info("++++++", this.taskName, "callback");
                    if (stats) {
                        log.info(stats.toString({
                            chunks: false,  // Makes the build much quieter
                            colors: true    // Shows colors in the console
                        }));
                    }
                    await this.done(error, stats);
                    if (this.isAllCompileDone()) {
                        WebpackTaskBase.compileQueue.forEach(async (context) => {
                            if (typeof context.callback === "function") {
                                await context.callback(); // .call(context.context);
                                context.callback = null;
                            }
                        });
                    }
                    // if (this.shouldDoneCallbackExec()) {
                    //     await this.doneCallback();
                    // }
                } catch (error) {
                    return reject(error);
                }
                resolve("succeess");
            };
            const compiler = webpack(config);
            WebpackTaskBase.compileQueue.push({
                state: false,
                callback: null,
            });
            this.index = WebpackTaskBase.compileQueue.length - 1;
            // this.compileContext.compiler = compiler;
            compiler.hooks.invalid.tap("alcor-webpack-task-base", () => {
                // log.info("++++++", this.taskName, "invalid");
                this.compileInvalid();
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
                this.bindExit();
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
    protected async doneCallback() {
        log.info(this.taskName, " empty doneCallback");
    }
    protected async done(webpackSelfError, stats) {
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
            log.error(`${this.taskName} has errors: `);
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
                log.warn(`${this.taskName} has warnings: `);
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
    }
    
    public bindExit() {
        process.on('SIGINT', () => {
            log.info('process SIGINT');
            if (this.watcher) {
                this.watcher.close(() => {
                    log.debug("before remove compileQueue.length: ", WebpackTaskBase.compileQueue.length);
                    WebpackTaskBase.compileQueue.splice(this.index, 1);
                    log.info('GC: remove compileQueue index: ', this.index);
                    WebpackTaskBase.compileQueue.splice(this.index, 1);
                    log.debug("after remove compileQueue.length: ", WebpackTaskBase.compileQueue.length);
                });
            }
        });
    }
}
export default WebpackTaskBase;
