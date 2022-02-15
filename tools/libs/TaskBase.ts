import { cyan, blue, green, red } from "colorette";
import ora, { type Ora } from "ora";
import path from "path";
import Logger from "./Logger";

const log = Logger("TaskBase");

export class TaskBase {
    protected watcher;
    protected count = 1;
    protected taskName = "TaskBase";
    protected isWatchMode = false;
    protected isDebugMode = false;
    protected isAnalyzMode = false;
    protected rootPath = "./";
    protected src = "";
    protected dist = "";
    protected state = false;
    protected spinner: Ora;

    constructor(name) {
        this.taskName = name;
        this.src = path.resolve("./src");
        this.dist = path.resolve("./build");
        this.spinner = ora();
    }

    protected async compile(config?): Promise<void|Error> {
        log.warn(`${cyan(this.taskName)} 未重写compile方法`);
    }

    protected async done(): Promise<void> {
        console.log(green(`${cyan(this.taskName)}, success`));
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
        try {
            this.spinner.start(`${this.taskName} compile task begin ...\r\n`);
            await this.compile(...args);
            this.spinner.succeed(`${this.taskName} compile task end.\r\n`);
        } catch (error) {
            this.spinner.fail(`${this.taskName} compile task ${red("fail")}.\r\n`)
            log.error(cyan(this.taskName), ".error: ", error.message);
            // if (argv.verbose || argv.debug) {
            log.error(error);
            // }
        }
    }
}

export default TaskBase;
