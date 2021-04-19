import { exec, execSync } from "child_process";
import * as Path from "path";
import { HelperTask } from "./HelperTask";
import Logger from "../libs/Logger";

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
export class ShellTask {
    public name = "ShellTask";
    public rootPath = Path.resolve("./");

    /**
     * @param cli
     */
    public async run(cli: string) {
        log.info("->", this.name, HelperTask.taking());
        log.info(this.name, "start", "cwd:", this.rootPath, "cli:", cli);
        try {
            const output = execSync(cli, {
                cwd: this.rootPath,
            });
            log.info(this.name, "output", output.toString());
        } catch (error) {
            log.error(this.name, "stdout", error.stdout.toString());
            log.error(this.name, "stderr", error.stderr.toString());
            const msg = this.name + " 执行失败,请检查代码或命令:" + cli;
            throw new Error(msg);
        }
    }
    public async exec(cli: string) {
        log.info(this.name, "start", "cwd:", this.rootPath, "cli:", cli);
        try {
            const output = exec(cli, {
                cwd: this.rootPath,
            });
            log.info(this.name, "output", output.toString());
        } catch (error) {
            log.error(this.name, "stdout", error.stdout.toString());
            log.error(this.name, "stderr", error.stderr.toString());
            const msg = this.name + " 执行失败,请检查代码或命令:" + cli;
            throw new Error(msg);
        }
    }
}
export default ShellTask;
