import fs from "fs-extra";
import { HelperTask } from "./HelperTask";
import Logger from "../libs/Logger";
import TaskBase from "../libs/TaskBase";

const log = Logger("CleanTask");
export class CleanTask extends TaskBase {
    constructor(taskName = "CleanTask") {
        super(taskName);
    }

    public start() {
        log.info("->", this.taskName, HelperTask.taking());
        try {
            fs.removeSync("build");
            log.info(`${this.taskName}.remove.build`);
        } catch (error) {
            log.error(`${this.taskName}.remove.error`, error.message);
        }
    }
}

export default CleanTask;
