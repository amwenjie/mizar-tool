import * as fs from "fs-extra";
import * as yargs  from "yargs";
import { hideBin } from "yargs/helpers";
import { HelperTask } from "./HelperTask";
import Logger from "../libs/Logger";

const argv:any = yargs(hideBin(process.argv)).argv;

let logCtg;
if (argv.verbose) {
    logCtg = "all";
} else if (argv.debug) {
    logCtg = "debug";
}
const log = Logger(logCtg);
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
