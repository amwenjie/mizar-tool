import { cyan } from "colorette";
import fs from "fs-extra";
import Logger from "../libs/Logger.js";
import TaskBase from "../libs/TaskBase.js";
import { HelperTask } from "./HelperTask.js";

const log = Logger("CleanTask");
export class CleanTask extends TaskBase {
    constructor(taskName = "CleanTask") {
        super(taskName);
    }

    protected async compile(): Promise<void> {
        log.info("->", cyan(this.taskName), HelperTask.taking());
        await fs.remove("dist");
    }
}

export default CleanTask;
