import * as fs from "fs-extra";
import { HelperTask } from "./HelperTask";
import Logger from "../libs/Logger";

const log = Logger("CleanTask");
export class CleanTask {
    public start() {
        log.info("->", "CleanTask", HelperTask.taking());
        try {
            fs.removeSync("build");
            log.info("CleanTask.remove.build");
        } catch (error) {
            log.error("CleanTask.build.error", error.message);
        }
    }
}
export default CleanTask;
