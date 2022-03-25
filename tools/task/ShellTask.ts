import { execSync } from "child_process";
import chokidar from "chokidar";
import { cyan, red } from "colorette";
import Logger from "../libs/Logger.js";
import TaskBase from "../libs/TaskBase.js";
import { HelperTask } from "./HelperTask.js";

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
            log.info(cyan(this.taskName), "output", output.toString());
        } catch (error) {
            log.error(red(`${cyan(this.taskName)} stdout: ${error.stdout.toString()}`));
            log.error(red(`${cyan(this.taskName)} stderr: ${error.stderr.toString()}`));
            const msg = cyan(this.taskName) + " 执行失败,请检查代码或命令:" + cli;
            throw new Error(msg);
        }
    }

    protected async compile(cmd: string, ...args): Promise<void> {
        log.info("->", cyan(this.taskName), HelperTask.taking());
        const cli = [
            cmd,
            ...args,
            this.src
        ].join(" ");
        log.info(cyan(this.taskName), "start", "cwd:", this.rootPath, "cli:", cli);
        this.exec(cli);
        
        if (this.isWatchMode) {
            this.watcher = chokidar
                .watch(this.src, {
                    interval: 600,
                })
                .on('change', path => {
                    log.info(cyan(this.taskName), " file change: ", path, " re-run shell");
                    this.exec(cli);
                });
            log.info(cyan(this.taskName), "start watching ", this.src);
        }
    }
}

export default ShellTask;
