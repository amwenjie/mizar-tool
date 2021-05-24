import { execSync } from "child_process";
import * as Path from "path";
import { HelperTask } from "./HelperTask";
import Logger from "../libs/Logger";

const log = Logger("PublishTask");
export class PublishTask {
    public buildPath = Path.normalize("build");

    public async start() {
        log.info("->", "PublishTask", HelperTask.taking());
        log.info("PublishTask.start.buildPath", this.buildPath, HelperTask.taking());
        const output = execSync("npm --registry https://registry.npmjs.org publish", {
            cwd: this.buildPath,
        });
        log.warn("PublishTask.output", output.toString());
    }
}
export default PublishTask;
