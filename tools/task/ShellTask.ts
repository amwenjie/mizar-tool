import { exec, execSync } from "child_process";
import * as chokidar from "chokidar";
import Path from "path";
import Logger from "../libs/Logger";
import TaskBase from "../libs/TaskBase";
import { HelperTask } from "./HelperTask";

const log = Logger("ShellTask");
export class ShellTask extends TaskBase {
    constructor(src: string = ".", taskName = "ShellTask") {
        super(taskName);
        this.src = src;
    }

    private exec(cli): void|Error {
        try {
            const output = execSync(cli, {
                cwd: this.rootPath,
            });
            log.info(this.taskName, "output", output.toString());
        } catch (error) {
            log.error(this.taskName, "stdout", error.stdout.toString());
            log.error(this.taskName, "stderr", error.stderr.toString());
            const msg = this.taskName + " 执行失败,请检查代码或命令:" + cli;
            throw new Error(msg);
        }
    }

    public async run(...args): Promise<void> {
        log.info("->", this.taskName, HelperTask.taking());
        const cli = [
            ...args,
            this.src
        ].join(" ");
        log.info(this.taskName, "start", "cwd:", this.rootPath, "cli:", cli);
        this.exec(cli);
        
        if (this.isWatchMode) {
            this.watcher = chokidar.watch(this.src)
                .on('change', path => {
                    log.info(this.taskName, " file change: ", path, " re-run shell");
                    this.exec(cli);
                });
            log.info(this.taskName, "start watching ", this.src);
        }
    }
}

export default ShellTask;
