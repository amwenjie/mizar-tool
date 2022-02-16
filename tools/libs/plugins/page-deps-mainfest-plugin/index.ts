import fs from "fs-extra";
import path from "path";
import getGlobalConfig from "../../../getGlobalConfig";
import { type Compilation, type Stats } from "webpack";
// import { getCompilerHooks } from "webpack-manifest-plugin";

const pluginName = "GatherPageDepsPlugin";
interface IOptions {
    isDebug: boolean;
}

function gatherDeps(bundleId: string, assetsKeys: string[]): Set<string> {
    const deps: Set<string> = new Set();
    // 遍历所有依赖bundle id
    if (bundleId.indexOf("(") > -1) {
        const regexp = /\(('|")?([^"')]+)\1?\)/g;
        let matched;
        while (matched = regexp.exec(bundleId)) {
            if (assetsKeys.some(k => new RegExp(matched[2] + "(?:_.{8})?\\.css$").test(k))) {
                deps.add(matched[2]);
            }
        }
    } else {
        if (assetsKeys.some(k => new RegExp(bundleId + "(?:_.{8})?\\.css$").test(k))) {
            deps.add(bundleId);
        }
    }
    return deps;
}

function getAsyncLoadComDeps(pageRouterContent, assetsKeys) {
    const depsMap: {[key: string]: Set<string>} = {};
    // 单个依赖的按需加载路由组件
    const singleDepRegexp = /\belement\:[\s\S]+?loader\:[\s\S]+?"?([^"\)\(]+)"?\)\.then\([\s\S]*?name\:\s*"([^"]+)"/g;
    // 多个依赖的按需加载路由组件
    const depRegexp = /\belement\:[^\[]+loader\:[^\[]+Promise\.all\([^\[]*?\[([^\]]+)\][\s\S]*?name\:\s*"([^"]+)"/g;
    let regexp = depRegexp.test(pageRouterContent) ? depRegexp : singleDepRegexp;
    let dependencies ;
    while (dependencies = regexp.exec(pageRouterContent)) {
        // dependencies[1]代表模块id， dependencies[2]代表路由配置组件name
        depsMap[`page/${dependencies[2]}`] = gatherDeps(dependencies[1], assetsKeys);
    }
    return depsMap;
}


function gatherPageComDeps(file: string, assetsKeys: string[], entryKey: string, isDebug = false): any {
    try {
        let fileContent = fs.readFileSync(file, {
            encoding: "utf-8"
        });
        let pageRouterContent = fileContent;
        // debug|dev模式变量名不会被混淆压缩，可以更精确的筛选后续匹配所需的内容
        if (isDebug) {
            const pageRouterContentMatch = /\bpageRouter\b\s*=([\s\S]+)\.bootstrap/.exec(fileContent);
            if (pageRouterContentMatch) {
                pageRouterContent = pageRouterContentMatch[1];
            }
        }
        const depsMap: {[key: string]: Set<string>} = getAsyncLoadComDeps(pageRouterContent, assetsKeys);
        // 再遍历不是按需加载路由组件
        const nameRegExp = /\bname\b[^"]+"([^"]+)"/g;
        let dependencies;
        while (dependencies = nameRegExp.exec(pageRouterContent)) {
            const pagePathKey: string = `page/${dependencies[1]}`;
            if (Array.isArray(depsMap[pagePathKey])) {
                depsMap[pagePathKey].add(entryKey);
            } else {
                depsMap[pagePathKey] = new Set([entryKey]);
            }
        }
        return depsMap;
    } catch (e) {
        console.error("gatheringDeps: ", e);
        throw e;
    }
}

export default class GatherPageDepsPlugin {
    entryKeys: string[];
    buildPath:string;
    assetsMainfest: string;
    constructor(protected readonly options: IOptions) {
        const conf = getGlobalConfig();
        this.buildPath = conf.rootOutput;
        this.assetsMainfest = conf.assetsMainfest;
    }
    apply(compiler) {
        // compiler.hooks.emit.tapAsync(pluginName, (compilation: Compilation, callback = () => {}) => {
        //     fs.writeJSON("./output_test.json", compilation.getStats().toJson(), {spaces: 4});
        //     // 1、从stats.modules中去遍历，取每个module.issuerName能匹配/src/isomorphic/pages/XXXX/index.tsx成功的module，
        //     // 2、把上一步取出来的module，
        //     callback();
        // });
        compiler.hooks.entryOption.tap(pluginName, (context, entry) => {
            this.entryKeys = Object.keys(entry || {
                index: ""
            });
        });
        compiler.hooks.done.tapAsync(pluginName, (stats: Stats, callback = () => {}) => {
            try {
                const assetsMap = fs.readJsonSync(`${this.buildPath}/${this.assetsMainfest}`);
                const assetKeys = Object.keys(assetsMap);
                const depsMap = {};
                // 遍历客户端打包入口，查找依赖
                this.entryKeys.forEach(entryKey => {
                    const index = assetKeys.filter(k => (new RegExp(`${entryKey}(?:_.{8})?\.js$`)).test(k));
                    const assetPath = assetsMap[index[0]];
                    if (assetPath) {
                        const map = gatherPageComDeps(path.resolve(this.buildPath + assetPath), assetKeys, entryKey, this.options.isDebug);
                        Object.keys(map).forEach(key => {
                            depsMap[key] = Array.from(map[key]);
                        });
                    }
                });
                if (JSON.stringify(depsMap) !== "{}") {
                    fs.writeJsonSync(this.buildPath + "/pageAssetsDeps.json", depsMap, { spaces: "  " });
                }
            } catch (e) {
                console.error(e);
            }

            callback();
        });
    }
}

// export default class GatherPageDepsPlugin {
//     constructor(protected readonly options: IOptions) {
//     }
//     apply(compiler) {
//         const { beforeEmit } = getCompilerHooks(compiler);
//         beforeEmit.tap('GatherPageDepsPlugin', manifest => {
//             console.log("GatherPageDepsPlugin ma")
//             const assetKeys = Object.keys(manifest);
//             const index = assetKeys.filter(k => /index(?:_.{8})?\.js$/.test(k));
//             if (manifest[index[0]]) {
//                 const map = gatheringDeps(path.resolve(this.options.buildPath + manifest[index[0]]), assetKeys);
//                 if (map && JSON.stringify(map) !== "{}") {
//                     fs.writeJsonSync(this.options.buildPath + "/pageAssetsDeps.json", map, { spaces: "  " });
//                 }
//             }
//             return manifest;
//         });
//     }
// }