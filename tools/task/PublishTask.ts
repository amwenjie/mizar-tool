import { execSync } from "child_process";
import * as Path from "path";
import { HelperTask } from "./HelperTask";
import Logger from "../libs/Logger";

const console = Logger();

export class PublishTask {
    public buildPath = Path.normalize("build");

    public async start() {
        console.log("->", "PublishTask", HelperTask.taking());
        console.info("PublishTask.start.buildPath", this.buildPath, HelperTask.taking());
        const output = execSync("npm --registry https://registry.npmjs.org publish", {
            cwd: this.buildPath,
        });
        console.warn("PublishTask.output", output.toString());
    }
}
export default PublishTask;
