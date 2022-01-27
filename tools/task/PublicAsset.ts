import gulp, { task } from "gulp";
import plumber from "gulp-plumber";
import Path from "path";
import Logger from "../libs/Logger";
import TaskBase from "../libs/TaskBase";
import { HelperTask } from "./HelperTask";
import getGlobalConfig from "../getGlobalConfig";

const log = Logger("PublicAsset");
export class PublicAsset extends TaskBase {
    private ext = "{js,less,css,sass,scss,txt,ico,ttf,gif,png,jpeg,jpg,swf,woff,woff2,webp,mp4,avi,flv}";

    constructor(src?: string, taskName: string = "PublicAsset") {
        super(taskName);
        this.dist = Path.resolve(getGlobalConfig().clientOutput);
        this.src = Path.resolve(this.rootPath, `src/public/**/*.${this.ext}`);
        if (src) {
            this.src = Path.resolve(this.rootPath, `src/${src}/**/*.${this.ext}`);
            this.dist = Path.resolve(getGlobalConfig().rootOutput, src);
        }
    }
    
    private copy(src): NodeJS.ReadWriteStream {
        log.info(this.taskName, " src: ", src, " dist: ", this.dist);
        return gulp.src(src)
            .pipe(plumber())
            // .pipe(rev())
            // .pipe(gulp.dest(this.dest))
            // .pipe(rev.mainfest())
            .pipe(gulp.dest(this.dist));
    }

    public async run(): Promise<void|Error> {
        return new Promise((resolve, reject) => {
            log.info("->", this.taskName, HelperTask.taking());
            log.info(this.taskName, ' src: ', this.src);
            this.copy(this.src)
                .on("end", e => {
                    if (e) {
                        reject(e);
                        return;
                    }
                    if (this.isWatchMode) {
                        const watcher = gulp.watch(this.src);
                        watcher.on("change", (eventType: string, filename: string) => {
                            log.info(this.taskName, " file " + filename + " was " + eventType + ", running tasks...");
                            this.copy(this.src);
                        });
                    }
                    log.info(this.taskName, " done ", this.count++);
                    resolve();
                })
                .on("error", e => {
                    log.info(this.taskName, " error ", e);
                    reject(e);
                });
        });
    }
}

export default PublicAsset;
