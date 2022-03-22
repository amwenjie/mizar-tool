import Logger from "../libs/Logger.js";
import TaskBase from "../libs/TaskBase.js";
import ShellTask from "./ShellTask.js";
const log = Logger("TSLint");
export class TSLint extends TaskBase {
    constructor(taskName = "TSLint") {
        super(taskName);
    }

    protected async compile(): Promise<void|Error> {
        log.info("TSLint start");
        await new ShellTask("./src").run("tslint", "-p");
    }
}
