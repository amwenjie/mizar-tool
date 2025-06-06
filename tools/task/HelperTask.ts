import { execSync } from "child_process";
import { cyan, green, red, yellow } from "colorette";
import Notifier from "node-notifier";
import yargs  from "yargs";
import { hideBin } from "yargs/helpers";
import { cliArgv } from "../interface.js";
import Logger from "../libs/Logger.js";
import TaskBase from "../libs/TaskBase.js";
import { CleanTask } from "./CleanTask.js";

const log = Logger();
const logColorMap = {
    info: green,
    debug: green,
    error: red,
    warn: yellow,
};

export class HelperTask extends TaskBase {
    private static prevDateTime = new Date();

    public static taking() {
        const now = new Date();
        const taking = now.getTime() - HelperTask.prevDateTime.getTime();
        HelperTask.prevDateTime = now;
        return `${taking / 1000} s`;
    }

    constructor(taskName = "HelperTask") {
        super(taskName);
        this.showVersion();
        process.once("SIGINT", () => {
            log.info("安全退出");
            process.exit();
        });
    }

    public startDateTime;
    public endDateTime;

    public showVersion(): HelperTask {
        log.info("->", "showVersion",
            "node@" + execSync("node -v").toString().replace(/\r|\n/g, ""),
            "npm@v" + execSync("npm -v").toString().replace(/\r|\n/g, ""),
            "typescipt@" + execSync("tsc -v").toString().replace(/\r|\n/g, ""),
        );
        return this;
    }

    public async sendMessage(titleStr: string, messageStr: string): Promise<void> {
        const argv:cliArgv = yargs(hideBin(process.argv)).argv as cliArgv;
        let logMethod = "info";
        if (/错误|error/.test(messageStr)) {
            logMethod = "error";
        } else if (/警告|warn/.test(messageStr)) {
            logMethod = "warn";
        }
        log[logMethod](cyan(titleStr), logColorMap[logMethod](messageStr));
        if (argv["notify"]) {
            Notifier.notify({
                message: messageStr.slice(0, 100),
                title: titleStr,
                wait: false,
                timeout: 3,
            });
        }
        Promise.resolve();
    }

    public start(): void {
        this.startDateTime = new Date();
        // this.spinner.start();
        // console.log();
        log.info("-------------------------------编译详细信息-------------------------------------");
    }

    public end(): void {
        this.endDateTime = new Date();
        // this.spinner.stop();
        log.info("-------------------------------编译信息结束-------------------------------------");
        // console.log();
        this.sendMessage("首次编译结束", "编译总耗时 " +
            ((this.endDateTime.getTime() - this.startDateTime.getTime()) / 1000) + " s");
        // this.spinner = null;
    }

    public async cleanAsync(): Promise<HelperTask> {
        await new CleanTask().setDebugMode(this.isDebugMode).run();
        return this;
    }
}

export default HelperTask;
