import { blue, green } from "colorette";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { HelperTask } from "../task/HelperTask";
import Logger from "./Logger";

const log = Logger("TaskBase");
const argv: any = yargs(hideBin(process.argv)).argv;

export class TaskBase {
    protected static compileQueue = [];
    protected static changedQueue = [];
    protected watcher;
    protected count = 1;
    protected index: number = -1;
    protected taskName = "TaskBase";
    protected watchModel = false;
    protected helperTask = new HelperTask();
    protected rootPath = "./";
    protected state = false;

    constructor(name) {
        this.taskName = name;
    }

    protected setTaskName(taskName: string) {
        this.taskName = taskName;
        return this;
    }

    protected async compile(config?): Promise<string | Error> {
        log.warn(`${this.taskName} 未重写compile方法`);
        return "";
    }

    protected async doneCallback() {
        console.log(green(`${this.taskName}, success`));
    }
    
    public setWatchModel(watchModel) {
        this.watchModel = watchModel;
        return this;
    }

    public async run() {
        log.info(this.taskName, " run ", HelperTask.taking());
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
