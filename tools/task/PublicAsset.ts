import chokidar from "chokidar";
import { cyan } from "colorette";
import fs from "fs-extra";
import { glob } from "glob";
import path from "node:path";
import getGlobalConfig from "../libs/getGlobalConfig.js";
import Logger from "../libs/Logger.js";
import TaskBase from "../libs/TaskBase.js";
import { HelperTask } from "./HelperTask.js";

const log = Logger("PublicAsset");
export class PublicAsset extends TaskBase {
    private ext = "{js,css,txt,ico,ttf,gif,png,jpeg,jpg,swf,woff,woff2,webp,mp4,avi,flv}";

    constructor(taskName = "PublicAsset") {
        super(taskName);
        this.dist = path.resolve(getGlobalConfig().rootOutput);
        this.src = path.resolve("./src");
        // this.src = `src/**/*.${this.ext}`;
    }
    
    private async copy() {
        const files = await glob(`${this.src}/**/*.${this.ext}`,{ ignore: ["node_modules/**", "dist/**", "test/**"] });
        log.info(cyan(this.getCmdName()), " find filelist: ", files);
        for (let i = 0, len = files.length; i < len; i++) {
            const filepath = files[i];
            const rel = path.relative(this.src, filepath);
            await fs.copy(filepath, path.resolve(this.dist, rel));
        }
    }

    protected async compile(): Promise<void|Error> {
        log.info("->", cyan(this.getCmdName()), HelperTask.taking());
        log.info(cyan(this.getCmdName()), " src: ", this.src, " , dist: ", this.dist);

        try {
            await this.copy();
            if (this.isWatchMode) {
                const watcher = chokidar.watch(this.src, {
                    interval: 600,
                });
                watcher.on("change", (path: string) => {
                    log.info(cyan(this.getCmdName()), " file " + path + " was has been changed, running PublicAsset task...");
                    this.copy();
                });
            }
            log.info(cyan(this.getCmdName()), " done ", this.count++);
        } catch (e) {
            log.info(cyan(this.getCmdName()), " error ", e);
            return e;
        }
    }
}

export default PublicAsset;
