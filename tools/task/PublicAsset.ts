import chokidar from "chokidar";
import { cyan } from "colorette";
import cpy from "cpy";
import path from "path";
import getGlobalConfig from "../libs/getGlobalConfig.js";
import Logger from "../libs/Logger.js";
import TaskBase from "../libs/TaskBase.js";
import { HelperTask } from "./HelperTask.js";

const log = Logger("PublicAsset");
export class PublicAsset extends TaskBase {
    private ext = "{js,css,txt,ico,ttf,gif,png,jpeg,jpg,swf,woff,woff2,webp,mp4,avi,flv}";

    constructor(taskName: string = "PublicAsset") {
        super(taskName);
        this.dist = path.resolve(getGlobalConfig().rootOutput);
        this.src = `src/**/*.${this.ext}`;
    }
    
    private copy() {
        return cpy(this.src, this.dist);
    }

    protected async compile(): Promise<void|Error> {
        return new Promise(async (resolve, reject) => {
            log.info("->", cyan(this.taskName), HelperTask.taking());
            log.info(cyan(this.taskName), " src: ", this.src, " , dist: ", this.dist);

            try {
                await this.copy();
                if (this.isWatchMode) {
                    const watcher = chokidar.watch(this.src, {
                        interval: 600,
                    });
                    watcher.on("change", async (path: string) => {
                        log.info(cyan(this.taskName), " file " + path + " was has been changed, running PublicAsset task...");
                        await this.copy();
                    });
                }
                log.info(cyan(this.taskName), " done ", this.count++);
                resolve();
            } catch (e) {
                log.info(cyan(this.taskName), " error ", e);
                reject(e);
            }
        });
    }
}

export default PublicAsset;
