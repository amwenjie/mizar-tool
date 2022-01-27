import Path from "path";
import { blue, green } from "colorette";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import Logger from "./Logger";

const log = Logger("TaskBase");
const argv: any = yargs(hideBin(process.argv)).argv as any;

export class TaskBase {
    protected static compileQueue = [];
    protected static changedQueue = [];
    protected watcher;
    protected count = 1;
    protected index: number = -1;
    protected taskName = "TaskBase";
    protected isWatchMode = false;
    protected isDebugMode = false;
    protected isAnalyzMode = false;
    protected rootPath = "./";
    protected src = "";
    protected dist = "";
    protected state = false;

    constructor(name) {
        this.taskName = name;
        this.src = Path.resolve("./src");
        this.dist = Path.resolve("./build");
    }

    protected async compile(config?): Promise<void|Error> {
        log.warn(`${this.taskName} 未重写compile方法`);
    }

    protected async doneCallback(): Promise<void> {
        console.log(green(`${this.taskName}, success`));
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

    public async run(...args): Promise<void|Error> {
        try {
            await this.compile();
        } catch (error) {
            log.error(this.taskName, ".error: ", error.message);
            if (argv.verbose || argv.debug) {
                log.error(error);
            }
        }
    }
}

export default TaskBase;
