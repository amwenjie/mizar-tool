import fs from "fs-extra";
import Path from "path";
import { getCompilerHooks } from "webpack-manifest-plugin";

interface IOptions {
    isDebug: boolean;
    entry: object;
    clientPath: string;
    buildPath: string;
    assetsFilename: string;
}

function gatherDeps(bundleId, assetsKeys: string[]) {
    const deps = [];
    // 遍历所有依赖bundle id
    if (bundleId.indexOf("(") > -1) {
        const regexp = /\(('|")?([^"')]+)\1?\)/g;
        let matched;
        while (matched = regexp.exec(bundleId)) {
            if (assetsKeys.some(k => {
                return (new RegExp(matched[2] + "(?:_.{8})?\\.css$")).test(k)
            })) {
                deps.push(matched[2]);
            }
        }
    } else {
        if (assetsKeys.some(k => {
            return (new RegExp(bundleId + "(?:_.{8})?\\.css$")).test(k)
        })) {
            deps.push(bundleId);
        }
    }
    return deps;
}

function gatherPageComDeps(file: string, assetsKeys: string[], entryKey: string, isDebug = false) {
    try {
        let fileContent = fs.readFileSync(file, {
            encoding: "utf-8"
        });
        let pageRouterContent = fileContent;
        if (isDebug) {
            const pageRouterContentMatch = /\bpageRouter\b([\s\S]+)\(pageRouter\)/.exec(fileContent);
            if (pageRouterContentMatch) {
                pageRouterContent = pageRouterContentMatch[1];
            }
        }
        const depsMap = {};
        let regexp;
        // 单个依赖的按需加载路由组件
        const singleDepRegexp = /component\:[\s\S]+?loader\:[\s\S]+?"?([^"\)\(]+)"?\)\.then\([\s\S]*?name\:\s*"([^"]+)"/g;
        // 多个依赖的按需加载路由组件
        const depRegexp = /component\:[^\[]+loader\:[^\[]+Promise\.all\([^\[]*?\[([^\]]+)\][\s\S]*?name\:\s*"([^"]+)"/g;
        regexp = depRegexp;
        let dependencies = regexp.exec(pageRouterContent);
        if (!dependencies) {
            regexp = singleDepRegexp;
            dependencies = regexp.exec(pageRouterContent);
        }
        while (dependencies) {
            // dependencies[1]代表模块id， dependencies[2]代表路由配置组件name
            depsMap["page/" + dependencies[2]] = gatherDeps(dependencies[1], assetsKeys).concat(entryKey);
            dependencies = regexp.exec(pageRouterContent);
        }
        // 再遍历不是按需加载路由组件
        const nameRegExp = /\bname\b[^"]+"([^"]+)"/g;
        dependencies = nameRegExp.exec(pageRouterContent);
        while (dependencies && !(("page/" + dependencies[1]) in depsMap)) {
            depsMap["page/" + dependencies[1]] = [entryKey];
            dependencies = nameRegExp.exec(pageRouterContent);
        }
        return depsMap;
    } catch (e) {
        console.error("gatheringDeps: ", e);
        throw e;
    }
}

export default class GatherPageDepsPlugin {
    constructor(protected readonly options: IOptions) {
    }
    apply(compiler) {
        compiler.hooks.done.tap('GatherPageDepsPlugin', (stats, callback = () => {}) => {
            const assetsMap = fs.readJsonSync(`${this.options.buildPath}/${this.options.assetsFilename}`);
            const assetKeys = Object.keys(assetsMap);
            const entryKeys = Object.keys(this.options.entry || {
                index: ""
            });
            const depsMap = {};
            // 遍历客户端打包入口，查找依赖
            entryKeys.forEach(entryKey => {
                const index = assetKeys.filter(k => (new RegExp(`${entryKey}(?:_.{8})?\.js$`)).test(k));
                const assetPath = assetsMap[index[0]];
                if (assetPath) {
                    const map = gatherPageComDeps(Path.resolve(this.options.buildPath + assetPath), assetKeys, entryKey, this.options.isDebug);
                    Object.assign(depsMap, map);
                }
            });
            if (JSON.stringify(depsMap) !== "{}") {
                fs.writeJsonSync(this.options.buildPath + "/pageAssetsDeps.json", depsMap, { spaces: "  " });
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
//                 const map = gatheringDeps(Path.resolve(this.options.buildPath + manifest[index[0]]), assetKeys);
//                 if (map && JSON.stringify(map) !== "{}") {
//                     fs.writeJsonSync(this.options.buildPath + "/pageAssetsDeps.json", map, { spaces: "  " });
//                 }
//             }
//             return manifest;
//         });
//     }
// }