import * as cssnano from "cssnano";
import * as gulp from "gulp";
import * as gulpless from "gulp-less";
import * as plumber from "gulp-plumber";
import * as postcss from "gulp-postcss";
import * as rev from "gulp-rev";
import * as autoprefixer from "autoprefixer";
import * as sourcemaps from "gulp-sourcemaps";
import * as inlineURLSPlugin from "less-plugin-inline-urls";
import * as Path from "path";
import * as precss from "precss";
import { ConfigHelper } from "../libs/ConfigHelper";
import Logger from "../libs/Logger";
import { HelperTask } from "./HelperTask";
import getGlobalConfig from "../getGlobalConfig";

import * as yargs  from "yargs";
import { hideBin } from "yargs/helpers";
const argv:any = yargs(hideBin(process.argv)).argv;

let logCtg;
if (argv.verbose) {
    logCtg = "all";
} else if (argv.debug) {
    logCtg = "debug";
}
const log = Logger(logCtg);

export class StylePack {
    public watchModel: boolean = false;
    private rootPath: string = "./";
    private count: number = 1;
    private src: string = Path.resolve(this.rootPath, "src/isomorphic/styleEntries");
    private taskName: string = "StylePack";
    private dest: string = getGlobalConfig().clientOutput;

    private lessCompile() {
        const src = this.src + "/**/*.less";
        let ieCompat = ConfigHelper.get("clientPack.style.ieCompat", true);
        const base64 = ConfigHelper.get("clientPack.style.base64", true);
        if (base64 === false) {
            ieCompat = undefined;
        }
        const sourcePaths = [src];
        let source = gulp.src(sourcePaths);
        source = source.pipe(plumber({
            errorHandler: e => {
                log.warn(`${this.taskName} less compile cause an error :`);
                log.warn(e);
                if (this.watchModel === false) {
                    throw e;
                }
                return true;
            },
        }));
        source = source.pipe(sourcemaps.init());
        const less = {
            paths: [
                Path.resolve(`${this.rootPath}/src/isomorphic/`),
                Path.resolve(`${this.rootPath}/src/public`),
            ],
            plugins: [],
            relativeUrls: true,
        };
        if (base64) {
            less["ieCompat"] = ieCompat;
            less.plugins.push(inlineURLSPlugin);
        }
        log.info("lessOption", JSON.stringify(less));
        source = source.pipe(gulpless(less));
        source = source.pipe(
            postcss([
                autoprefixer(),
                precss,
                cssnano()
            ]));
        if (this.watchModel) {
            source = source.pipe(sourcemaps.write("./"));
        }
        source = source.pipe(rev());
        source = source.pipe(gulp.dest(this.dest));
        // source = source.pipe(rev.mainfest());
        // source = source.pipe(gulp.dest(getGlobalConfig().clientOutput));

        source.on("end", (event) => {
            log.info(this.taskName + " > done", this.count++);
        });
        return source;
    }

    public setWatchModel(watchModel: boolean) {
        this.watchModel = watchModel;
        return this;
    }

    public async run() {
        return new Promise((resolve, reject) => {
            log.info("->", this.taskName, HelperTask.taking());

            this.lessCompile().on("end", e => {
                if (e) {
                    reject(e);
                    return;
                }
                if (this.watchModel) {
                    const watcher = gulp.watch(this.src, this.lessCompile);
                    watcher.on("change", (eventType: string, filename: string) => {
                        log.info("开始编译less:", "file " + filename + " was " + eventType + ", running tasks...");
                    });
                }
                log.info(this.taskName, "done", this.count++);
                resolve("done");
            }).on("error", e => {
                log.info("StylePack.error", e);
                reject(e);
            });
        });
    }
}
export default StylePack;