// import cssnano from "cssnano";
// import gulp from "gulp";
// import gulpless from "gulp-less";
// import plumber from "gulp-plumber";
// import postcss from "gulp-postcss";
// import rev from "gulp-rev";
// import autoprefixer from "autoprefixer";
// import sourcemaps from "gulp-sourcemaps";
// import inlineURLSPlugin from "less-plugin-inline-urls";
// import Path from "path";
// import precss from "precss";
// import TaskBase from "../libs/TaskBase";
// import { ConfigHelper } from "../libs/ConfigHelper";
// import Logger from "../libs/Logger";
// import { HelperTask } from "./HelperTask";
// import getGlobalConfig from "../getGlobalConfig";

// const log = Logger("StylePack");

// export class StylePack extends TaskBase {
//     private src: string = Path.resolve(this.rootPath, "src/isomorphic/styleEntries");
//     private dest: string = getGlobalConfig().clientOutput;

//     constructor() {
//         super();
//         this.taskName = "StylePack";
//     }

//     private lessCompile() {
//         const src = this.src + "/**/*.less";
//         let ieCompat = ConfigHelper.get("clientPack.style.ieCompat", true);
//         const base64 = ConfigHelper.get("clientPack.style.base64", true);
//         if (base64 === false) {
//             ieCompat = undefined;
//         }
//         const sourcePaths = [src];
//         let source = gulp.src(sourcePaths);
//         source = source.pipe(plumber({
//             errorHandler: e => {
//                 log.warn(`${this.taskName} less compile cause an error :`);
//                 log.warn(e);
//                 if (this.watchModel === false) {
//                     throw e;
//                 }
//                 return true;
//             },
//         }));
//         source = source.pipe(sourcemaps.init());
//         const less = {
//             paths: [
//                 Path.resolve(`${this.rootPath}/src/isomorphic`),
//                 Path.resolve(`${this.rootPath}/src/public`),
//             ],
//             plugins: [],
//             relativeUrls: true,
//         };
//         if (base64) {
//             less["ieCompat"] = ieCompat;
//             less.plugins.push(inlineURLSPlugin);
//         }
//         log.info("lessOption", JSON.stringify(less));
//         source = source.pipe(gulpless(less));
//         source = source.pipe(
//             postcss([
//                 autoprefixer(),
//                 precss,
//                 cssnano()
//             ]));
//         if (this.watchModel) {
//             source = source.pipe(sourcemaps.init());
//         }
//         source = source.pipe(rev());
//         if (this.watchModel) {
//             source = source.pipe(sourcemaps.write("./"));
//         }
//         source = source.pipe(gulp.dest(this.dest));
//         source = source.pipe(rev.manifest("assetsMainfest.json"));
//         source = source.pipe(gulp.dest(this.dest));
//         // gulp.dest(getGlobalConfig().clientOutput));

//         source.on("end", (event) => {
//             log.info(this.taskName + " > done", this.count++);
//         });
//         return source;
//     }

//     public setWatchModel(watchModel: boolean) {
//         this.watchModel = watchModel;
//         return this;
//     }

//     protected async compile(): Promise<string | Error> {
//         return new Promise((resolve, reject) => {
//             log.info("->", this.taskName, HelperTask.taking());

//             this.lessCompile().on("end", e => {
//                 if (e) {
//                     log.error(this.taskName, " compile has error: ", e);
//                     reject(e);
//                     return;
//                 }
//                 if (this.watchModel) {
//                     const watcher = gulp.watch(this.src);
//                     watcher.on("change", (filename: string) => {
//                         log.info("less file change: " + filename);
//                         this.lessCompile();
//                     });
//                 }
//                 // log.info(this.taskName, "done", this.count++);
//                 resolve("done");
//             }).on("error", e => {
//                 log.info("StylePack.error", e);
//                 reject(e);
//             });
//         });
//     }
// }
// export default StylePack;