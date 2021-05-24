import * as gulp from "gulp";
import * as uglify from "gulp-uglify";
import { HelperTask } from "./HelperTask";
import Logger from "../libs/Logger";
const log = Logger("UglifyJSTask");
export class UglifyJSTask {
    private uglifyProcess (src) {
        return gulp.src(src)
            .pipe(uglify())
            .pipe(gulp.dest("./build"));
    }
    public run() {
        log.info("->", "UglifyJSTask", HelperTask.taking());
        return new Promise((resolve, reject) => {
            this.uglifyProcess("./build/**/*.js")
                .on("end", e => {
                    if (e) {
                        reject(e);
                        return;
                    }
                    log.info("UglifyJSTask.end");
                    resolve("done");
                }).on("error", e => {
                    log.info("UglifyJSTask.error", e);
                    reject(e);
                });
        });
    }
}
export default UglifyJSTask;
