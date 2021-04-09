import * as gulp from "gulp";
import * as uglify from "gulp-uglify";
import { HelperTask } from "./HelperTask";
import Logger from "../libs/Logger";

const console = Logger();
export class UglifyJSTask {
    private uglifyProcess (src) {
        return gulp.src(src)
            .pipe(uglify())
            .pipe(gulp.dest("./build"));
    }
    public run() {
        console.log("->", "UglifyJSTask", HelperTask.taking());
        return new Promise((resolve, reject) => {
            this.uglifyProcess("./build/**/*.js")
                .on("end", e => {
                    if (e) {
                        reject(e);
                        return;
                    }
                    console.info("UglifyJSTask.end");
                    resolve("done");
                }).on("error", e => {
                    console.info("UglifyJSTask.error", e);
                    reject(e);
                });
        });
    }
}
export default UglifyJSTask;
