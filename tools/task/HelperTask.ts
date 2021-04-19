import { execSync } from "child_process";
import * as Notifier from "node-notifier";
import * as ora from "ora";
import * as yargs  from "yargs";
import { hideBin } from "yargs/helpers";
import { CleanTask } from "./CleanTask";
import Logger from "../libs/Logger";

const argv:any = yargs(hideBin(process.argv)).argv;

let logCtg;
if (argv.verbose) {
    logCtg = "all";
} else if (argv.debug) {
    logCtg = "debug";
}
const log = Logger(logCtg);

export class HelperTask {
    constructor() {
        this.spinner = ora("running task...");
    }
    public static taking() {
        const now = new Date();
        const taking = now.getTime() - HelperTask.prevDateTime.getTime();
        HelperTask.prevDateTime = now;
        return `${taking / 1000} s`;
    }
    private static prevDateTime = new Date();
    private watchModel = false;
    private spinner;
    public startDateTime;
    public endDateTime;
    public init() {
        this.showVersion();
        process.once("SIGINT", () => {
            log.info("安全退出");
            process.exit();
        });
    }
    public setWatchModel(watchModel = true) {
        this.watchModel = watchModel;
        return this;
    }
    public showVersion() {
        log.info("->", "showVersion",
            "node@" + execSync("node -v").toString().replace(/\r|\n/g, ""),
            "npm@v" + execSync("npm -v").toString().replace(/\r|\n/g, ""),
            "typescipt@" + execSync("tsc -v").toString().replace(/\r|\n/g, ""),
        );
    }
    public async sendMessage(titleStr: string, messageStr: string) {
        const argv = yargs(hideBin(process.argv)).argv;
        if (argv["no-notify"]) {
            return;
        }
        log.info("sendMessage", titleStr, messageStr);
        const msg = {
            message: messageStr.substr(0, 100),
            title: titleStr,
            wait: false,
        };
        Notifier.notify(msg);
    }
    public start() {
        this.startDateTime = new Date();
        this.spinner.start();
        log.log();
        log.info("-------------------------------编译详细信息-------------------------------------");
    }
    public end() {
        this.endDateTime = new Date();
        this.spinner.stop();
        log.info("-------------------------------编译信息结束-------------------------------------");
        log.info("编译总耗时", (this.endDateTime.getTime() - this.startDateTime.getTime()) / 1000, "s");
        log.log();
        this.sendMessage("首次编译结束", "编译总耗时 " +
            ((this.endDateTime.getTime() - this.startDateTime.getTime()) / 1000) + " s");
        this.spinner = null;
    }

    public async cleanAsync() {
        await new CleanTask().start();
    }
}

export default HelperTask;
