import { cyan, green, red } from "colorette";
import ora from "ora";
import path from "node:path";
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
    protected cmdName: string;

    constructor(name: string) {
        this.taskName = name;
        this.src = path.resolve("./src");
        this.dist = path.resolve("./dist");
    }

    protected async compile(config?): Promise<void|Error> {
        return Promise.resolve(log.warn(`${cyan(this.taskName)} 未重写compile方法`));
    }

    protected async done(): Promise<void> {
        // console.log(green(`${cyan(this.taskName)} task completed.\n`))
        return Promise.resolve();
    }

    public getCmdName(): string {
        if (this.cmdName) {
            return this.cmdName;
        }
        return this.taskName;
    }
    
    protected setCmdName(str: string) {
        this.cmdName = str;
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
        this.setCmdName(
            (this.isDebugMode ? [this.taskName] : []).concat(
                [this.src, ...args]
            ).join(' '));
        try {
            spinner && spinner.start(`${this.getCmdName()} compile task running ...\r\n`);
            const compileArgs = [...args];
            await this.compile(...compileArgs);
            spinner && spinner.succeed(`${this.getCmdName()} compile task done.\r\n`);
        } catch (e) {
            spinner && spinner.fail(`${this.getCmdName()} compile task ${red("fail")}.\r\n`);
            log.error(red(`${cyan(this.getCmdName())}  error: ${e.message}\r\n`), e);
        }
    }
}

export default TaskBase;
