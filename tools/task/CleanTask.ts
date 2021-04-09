import * as fs from "fs-extra";
import { HelperTask } from "./HelperTask";
import Logger from "../libs/Logger";

const console = Logger();
export class CleanTask {
    public start() {
        console.log("->", "CleanTask", HelperTask.taking());
        try {
            fs.removeSync("build");
            console.info("CleanTask.remove.build");
        } catch (error) {
            console.error("CleanTask.build.error", error.message);
        }
    }
}
export default CleanTask;
