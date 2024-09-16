import { cyan } from "colorette";
import fs from "fs-extra";
import path from "path";
import getGlobalConfig from "../libs/getGlobalConfig.js";
import Logger from "../libs/Logger.js";
import TaskBase from "../libs/TaskBase.js";
import { HelperTask } from "./HelperTask.js";

const log = Logger("CopyTask");
export class CopyTask extends TaskBase {
    constructor(src: string, dist = "", taskName = "CopyTask") {
        super(taskName);
        this.src = path.resolve(this.rootPath, src);
        this.dist = path.resolve(getGlobalConfig().rootOutput, dist);
    }

    protected async compile(): Promise<void> {
        log.info("->", cyan(this.getCmdName()), HelperTask.taking());
        await fs.copy(this.src, this.dist);
    }
}
export default CopyTask;
