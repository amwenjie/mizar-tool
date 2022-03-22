import Logger from "../libs/Logger";
import TaskBase from "../libs/TaskBase";
import ShellTask from "./ShellTask";
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
