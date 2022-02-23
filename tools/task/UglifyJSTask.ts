import gulp from "gulp";
import uglify from "gulp-uglify";
import { HelperTask } from "./HelperTask";
import Logger from "../libs/Logger";
import TaskBase from "../libs/TaskBase";

const log = Logger("UglifyJSTask");
export class UglifyJSTask extends TaskBase {
    constructor(taskName = "UglifyJSTask") {
        super(taskName);
    }
    private uglifyProcess (src) {
        return gulp.src(src)
            .pipe(uglify())
            .pipe(gulp.dest("./dist"));
    }
    
    protected async compile(): Promise<void|Error> {
        log.info("->", "UglifyJSTask", HelperTask.taking());
        return new Promise((resolve, reject) => {
            this.uglifyProcess("./dist/**/*.js")
                .on("end", e => {
                    if (e) {
                        reject(e);
                        return;
                    }
                    log.info("UglifyJSTask.end");
                    resolve();
                }).on("error", e => {
                    log.info("UglifyJSTask.error", e);
                    reject(e);
                });
        });
    }
}
export default UglifyJSTask;
