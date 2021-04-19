import Logger from "../libs/Logger";
import ShellTask from "./ShellTask";
import * as yargs  from "yargs";
import { hideBin } from "yargs/helpers";
const argv:any = yargs(hideBin(process.argv)).argv;

let logCtg;
if (argv.verbose) {
    logCtg = "all";
} else if (argv.debug) {
    logCtg = "debug";
}
const log = Logger(logCtg);
export class TSLint {
    public async run() {
        log.log("TSLint start");
        try {
            await new ShellTask().run("tslint -p ./src");
            log.info("TSLint is ok");
        } catch (error) {
            log.warn("代码规范&格式检查未通过，TSLint not ok");
        }
    }
}
