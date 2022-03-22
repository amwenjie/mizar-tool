import { cyan } from "colorette";
import chokidar from "chokidar";
import cpy from "cpy";
import path from "path";
import getGlobalConfig from "../libs/getGlobalConfig";
import Logger from "../libs/Logger";
import TaskBase from "../libs/TaskBase";
import { HelperTask } from "./HelperTask";

const log = Logger("PublicAsset");
export class PublicAsset extends TaskBase {
    private ext = "{js,less,css,sass,scss,txt,ico,ttf,gif,png,jpeg,jpg,swf,woff,woff2,webp,mp4,avi,flv}";
    private sources: string[];

    constructor(taskName: string = "PublicAsset") {
        super(taskName);
        this.dist = path.resolve(getGlobalConfig().rootOutput);
        this.sources = [
            `public/**/*.${this.ext}`,
            `iso/**/*.${this.ext}`,
        ];
    }
    
    private copy() {
        return cpy(this.sources, this.dist, {
            cwd: path.resolve("./src"),
            parents: true,
        });
    }

    protected async compile(): Promise<void|Error> {
        return new Promise((resolve, reject) => {
            log.info("->", cyan(this.taskName), HelperTask.taking());
            log.info(cyan(this.taskName), " sources: ", this.sources, " , dist: ", this.dist);
            
            this.copy()
                .then(() => {
                    if (this.isWatchMode) {
                        const watcher = chokidar.watch(this.sources, {
                            cwd: path.resolve("./src"),
                            interval: 600,
                        });
                        watcher.on("change", (path: string) => {
                            log.info(cyan(this.taskName), " file " + path + " was has been changed, running PublicAsset task...");
                            this.copy();
                        });
                    }
                    log.info(cyan(this.taskName), " done ", this.count++);
                    resolve();
                })
                .catch(e => {
                    log.info(cyan(this.taskName), " error ", e);
                    reject(e);
                });
        });
    }
}

export default PublicAsset;
