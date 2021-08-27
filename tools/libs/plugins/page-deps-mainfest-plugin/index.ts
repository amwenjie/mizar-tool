import fs from "fs-extra";
import Path from "path";
import { getCompilerHooks } from "webpack-manifest-plugin";

interface IOptions {
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

function gatherPageComDeps(file, assetsKeys: string[]) {
    try {
        let fileContent = fs.readFileSync(file, {
            encoding: "utf-8"
        });
        const depsMap = {};
        let regexp;
        // 单个依赖的按需加载路由组件
        const singleDepRegexp = /component\:[\s\S]+?loader\:[\s\S]+?"?([^"\)\(]+)"?\)\.then\([\s\S]*?name\:\s*"([^"]+)"/g;
        // 多个依赖的按需加载路由组件
        const depRegexp = /component\:[^\[]+loader\:[^\[]+Promise\.all\([^\[]*?\[([^\]]+)\][\s\S]*?name\:\s*"([^"]+)"/g;
        regexp = depRegexp;
        let dependencies = regexp.exec(fileContent);
        if (!dependencies) {
            regexp = singleDepRegexp;
            dependencies = regexp.exec(fileContent);
        }
        while (dependencies) {
            depsMap["page/" + dependencies[2]] = gatherDeps(dependencies[1], assetsKeys);
            dependencies = regexp.exec(fileContent);
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
            // 下面这个index文件名，是因为客户端资源打包入口（pageRouter或其他）的文件是index.tsx，如果打包入口变动，这里需要一起变动
            const index = assetKeys.filter(k => /index(?:_.{8})?\.js$/.test(k));
            if (assetsMap[index[0]]) {
                const map = gatherPageComDeps(Path.resolve(this.options.buildPath + assetsMap[index[0]]), assetKeys);
                if (map && JSON.stringify(map) !== "{}") {
                    fs.writeJsonSync(this.options.buildPath + "/pageAssetsDeps.json", map, { spaces: "  " });
                }
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