import * as fs from "fs-extra";
import * as Path from "path";
import { HelperTask } from "./HelperTask";
import Logger from "../libs/Logger";
import getGlobalConfig from "../getGlobalConfig";

const log = Logger("CopyTask");
export class CopyTask {
    public taskName = "CopyTask";
    public watchModel: boolean = false;
    private rootPath: string = "./";
    private src = "";
    private dest = Path.resolve(getGlobalConfig().rootOutput);

    constructor(src: string, dest?: string, taskName?: string) {
        this.src = Path.resolve(this.rootPath, src);
        if (dest) {
            this.dest = Path.resolve(getGlobalConfig().rootOutput, dest);
        }
        if (taskName) {
            this.taskName = taskName;
        }
    }

    public run() {
        log.info("->", "CopyTask", HelperTask.taking());
        return fs.copy(this.src, this.dest);
    }
}
export default CopyTask;
