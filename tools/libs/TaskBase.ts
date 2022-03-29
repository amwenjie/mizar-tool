import { cyan, green, red } from "colorette";
import ora from "ora";
import path from "path";
import Logger from "./Logger.js";

const log = Logger("TaskBase");

export class TaskBase {
    protected watcher;
    protected count = 1;
    protected taskName = "TaskBase";
    protected isWatchMode = false;
    protected isDebugMode = false;
    protected isAnalyzMode = false;
    protected rootPath = "./";
    protected src: string;
    protected dist: string;
    protected state = false;

    constructor(name) {
        this.taskName = name;
        this.src = path.resolve("./src");
        this.dist = path.resolve("./dist");
    }

    protected async compile(config?): Promise<void|Error> {
        return Promise.resolve(log.warn(`${cyan(this.taskName)} 未重写compile方法`));
    }

    protected async done(): Promise<void> {
        return Promise.resolve(console.log(green(`${cyan(this.taskName)} task completed.\n`)));
    }
    
    public setWatchMode(isWatchMode: boolean): TaskBase {
        this.isWatchMode = isWatchMode;
        return this;
    }

    public setDebugMode(isDebugMode: boolean): TaskBase {
        this.isDebugMode = isDebugMode;
        return this;
    }

    public setAnalyzMode(isAnalyzMode: boolean): TaskBase {
        this.isAnalyzMode = isAnalyzMode;
        return this;
    }

    public async run(...args): Promise<void> {
        const spinner = !this.isDebugMode && ora();

        try {
            spinner && spinner.start(`${this.taskName} compile task begin ...\r\n`);
            await this.compile(...args);
            spinner && spinner.succeed(`${this.taskName} compile task end.\r\n`);
        } catch (error) {
            spinner && spinner.fail(`${this.taskName} compile task ${red("fail")}.\r\n`)
            log.error(red(`${cyan(this.taskName)}  error: ${error.message}`), error);
        }
    }
}

export default TaskBase;
