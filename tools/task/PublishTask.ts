import { execSync } from "child_process";
import Logger from "../libs/Logger.js";
import TaskBase from "../libs/TaskBase.js";
import { HelperTask } from "./HelperTask.js";

const log = Logger("PublishTask");
export class PublishTask extends TaskBase {
    constructor(taskName = "PublishTask") {
        super(taskName);
    }

    public async compile(): Promise<void> {
        log.info("->", "PublishTask", HelperTask.taking());
        log.info("PublishTask.start.distPath", this.dist, HelperTask.taking());
        const output = execSync("npm --registry https://registry.npmjs.org publish", {
            cwd: this.dist,
        });
        log.warn("PublishTask.output", output.toString());
    }
}
export default PublishTask;
