import * as yargs  from "yargs";
import { hideBin } from "yargs/helpers";
import * as Path from "path";
import * as webpack from "webpack";
import { HelperTask } from "../task/HelperTask";
import Logger from "./Logger";

const argv:any = yargs(hideBin(process.argv)).argv;

let logCtg;
if (argv.verbose) {
    logCtg = "all";
} else if (argv.debug) {
    logCtg = "debug";
}
const log = Logger(logCtg);

export class WebpackTaskBase {
    public taskName = "WebpackTaskBase";
    public watchModel = false;
    public count = 1;
    public helperTask = new HelperTask();
    public projectRoot = Path.resolve(".");

    public setTaskName(taskName: string) {
        this.taskName = taskName;
    }

    public setWatchModel(watchModel) {
        this.watchModel = watchModel;
        return this;
    }

    protected async webpack(config) {
        return new Promise(async (resolve, reject) => {
            const compiler = webpack(config);
            if (this.watchModel) {
                compiler.watch({}, async (error, stats) => {
                    await this.done(error, stats);
                    resolve("succeess");
                });
            } else {
                compiler.run(async (error, stats) => {
                    if (error) {
                        return reject(error);
                    }
                    try {
                        await this.done(error, stats);
                    } catch (error) {
                        return reject(error);
                    }
                    resolve("succeess");
                });
            }
        });
    }
    protected async doneCallback() {
        log.info(this.taskName, "doneCallback");
    }
    protected async done(webpackSelfError, stats) {
        if (webpackSelfError) {
            log.error(this.taskName, "> error", webpackSelfError.stack || webpackSelfError);
            if (webpackSelfError.details) {
                log.error(webpackSelfError.details);
            }
            this.helperTask.sendMessage(this.taskName, "webpack运行有错" + this.count);
            return;
        }
        const info = stats.toJson();
        const errors = info.errors;
        log.warn("共有错误数：", errors.length);
        const warnings = info.warnings;
        log.warn("共有警告数：", warnings.length);

        if (stats.hasErrors()) {
            // 有错误
            log.error(`${this.taskName} has error: `);
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
                log.warn(`${this.taskName} has warning: `);
                log.warn(info.warnings);
            }
            // if (this.watchModel === true) {
            //     warnings.forEach((warning) => {
            //         log.warn(`WebpackTaskBase ${this.taskName} warning : ${warning}`);
            //     });
            // }
            // const firstWarning = warnings[0];
            this.helperTask.sendMessage(this.taskName, "代码有警告 ");
        }

        // 完成
        log.info(this.taskName + ".done", this.count++);
        await this.doneCallback();
        this.helperTask.sendMessage(this.taskName, "编译结束:" + this.count);
    }
}
export default WebpackTaskBase;
