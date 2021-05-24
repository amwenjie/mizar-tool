import * as gulp from "gulp";
import * as plumber from "gulp-plumber";
import * as rev from "gulp-rev";
import * as Path from "path";
import Logger from "../libs/Logger";
import { HelperTask } from "./HelperTask";
import getGlobalConfig from "../getGlobalConfig";

const log = Logger("PublicAsset");
export class PublicAsset {
    public taskName = "PublicAsset";
    public watchModel: boolean = false;
    private rootPath: string = "./";
    private count = 1;
    private ext = "{js,less,css,txt,ico,ttf,gif,png,jpeg,jpg,swf,woff,woff2,webp,mp4,avi,flv}";
    private src = Path.resolve(this.rootPath, `src/public/**/*.${this.ext}`);
    private dest = Path.resolve(getGlobalConfig().rootOutput, "public");

    private copy(src) {
        log.info(this.taskName, " src: ", src, " dest: ", this.dest);
        return gulp.src(src)
            .pipe(plumber())
            // .pipe(rev())
            // .pipe(gulp.dest(this.dest))
            // .pipe(rev.mainfest())
            .pipe(gulp.dest(this.dest));
    }

    constructor(src?: string, taskName?: string) {
        this.dest = getGlobalConfig().clientOutput;
        if (src) {
            this.src = Path.resolve(this.rootPath, `src/${src}/**/*.${this.ext}`);
            this.dest = Path.resolve(getGlobalConfig().rootOutput, src);
        }
        if (taskName) {
            this.taskName = taskName;
        }
    }

    public setWatchModel(watchModel: boolean) {
        this.watchModel = watchModel;
        return this;
    }

    public async run() {
        return new Promise((resolve, reject) => {
            log.info("->", this.taskName, HelperTask.taking());
            log.info(this.taskName, ' src: ', this.src);
            this.copy(this.src).on("end", e => {
                if (e) {
                    reject(e);
                    return;
                }
                if (this.watchModel) {
                    const watcher = gulp.watch(this.src);
                    watcher.on("change", (eventType: string, filename: string) => {
                        log.info(this.taskName, " file " + filename + " was " + eventType + ", running tasks...");
                        this.copy(this.src);
                    });
                }
                log.info(this.taskName, " done ", this.count++);
                resolve("done");
            }).on("error", e => {
                log.info(this.taskName, " error ", e);
                reject(e);
            });
        });
    }
}
export default PublicAsset;
