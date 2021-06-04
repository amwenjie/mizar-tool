import { exec, execSync } from "child_process";
import Path from "path";
import { HelperTask } from "./HelperTask";
import * as chokidar from "chokidar";
import Logger from "../libs/Logger";
const log = Logger("ShellTask");
export class ShellTask {
    constructor(src: string) {
        this.src = src;
    }

    private rootPath = Path.resolve("./");
    private src = ".";
    private watcher;
    
    public taskName = "ShellTask";
    public watchModel: boolean = false;

    private exec(cli) {
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

    public setWatchModel(watchModel) {
        this.watchModel = watchModel;
        return this;
    }

    public async run(cmd: string, ...args) {
        log.info("->", this.taskName, HelperTask.taking());
        const cli = [
            cmd,
            ...args,
            this.src
        ].join(" ");
        log.info(this.taskName, "start", "cwd:", this.rootPath, "cli:", cli);
        this.exec(cli);
        
        if (this.watchModel) {
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
