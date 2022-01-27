import fs from "fs-extra";
import Path from "path";
import getGlobalConfig from "../getGlobalConfig";
import Logger from "../libs/Logger";
import TaskBase from "../libs/TaskBase";
import { HelperTask } from "./HelperTask";

const log = Logger("CopyTask");
export class CopyTask extends TaskBase {
    constructor(src: string, dist: string = "", taskName: string = "CopyTask") {
        super(taskName);
        this.src = Path.resolve(this.rootPath, src);
        this.dist = Path.resolve(getGlobalConfig().rootOutput, dist);
    }

    public async run(): Promise<void> {
        log.info("->", this.taskName, HelperTask.taking());
        return fs.copy(this.src, this.dist);
    }
}
export default CopyTask;
