import { execSync } from "child_process";
import * as Notifier from "node-notifier";
import * as yargs  from "yargs";
import { hideBin } from "yargs/helpers";
import { CleanTask } from "./CleanTask";
import Logger from "../libs/Logger";

const console = Logger();

export class HelperTask {
    public static taking() {
        const now = new Date();
        const taking = now.getTime() - HelperTask.prevDateTime.getTime();
        HelperTask.prevDateTime = now;
        return `${taking / 1000} s`;
    }
    private static prevDateTime = new Date();
    public startDateTime;
    public endDateTime;
    private watchModel = false;
    public init() {
        this.showVersion();
        process.once("SIGINT", () => {
            console.log("安全退出");
            process.exit();
        });
    }
    public setWatchModel(watchModel = true) {
        this.watchModel = watchModel;
        return this;
    }
    public showVersion() {
        console.log("->", "showVersion",
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
        console.info("sendMessage", titleStr, messageStr);
        const msg = {
            message: messageStr.substr(0, 100),
            title: titleStr,
            wait: false,
        };
        Notifier.notify(msg);
    }
    public start() {
        this.startDateTime = new Date();
        console.log();
        console.log("-------------------------------编译详细信息-------------------------------------");
    }
    public end() {
        this.endDateTime = new Date();
        console.log("-------------------------------编译信息结束-------------------------------------");
        console.log("编译总耗时", (this.endDateTime.getTime() - this.startDateTime.getTime()) / 1000, "s");
        console.log();
        this.sendMessage("首次编译结束", "编译总耗时 " +
            ((this.endDateTime.getTime() - this.startDateTime.getTime()) / 1000) + " s");
    }

    public async cleanAsync() {
        await new CleanTask().start();
    }
}

export default HelperTask;
