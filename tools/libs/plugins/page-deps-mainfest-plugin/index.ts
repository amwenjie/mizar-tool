import fs from "fs-extra";
import Path from "path";
import { getCompilerHooks } from "webpack-manifest-plugin";

interface IOptions {
    clientPath: string;
    buildPath: string;
    assetsFilename: string;
}

function gatheringDeps(file, assetsKeys: string[]) {
    const depsMap = {};
    try {
        let fileContent = fs.readFileSync(file, {
            encoding: "utf-8"
        });
        // 找到按需加载组件的依赖和名称
        const depRegexp = /component\:[^\[]+loader\:[^\[]+Promise\.all\([^\[]*?\[([^\]]+)\][\s\S]*?name\:\s*"([^"]+)"/g;
        let dependencies = depRegexp.exec(fileContent);
        while (dependencies) {
            const regexp = /\(('|")?([^"')]+)\1?\)/g;
            const pageDeps = dependencies[1];
            let matched;
            const deps = [];
            // 遍历所有依赖bundle id
            while (matched = regexp.exec(pageDeps)) {
                if (assetsKeys.some(k => {
                    return (new RegExp(matched[2] + "(?:_.{8})?\\.css$")).test(k)
                })) {
                    deps.push(matched[2]);
                }
            }
            depsMap["page/" + dependencies[2]] = deps;
            dependencies = depRegexp.exec(fileContent);
        }
    } catch (e) {
        console.error("gatheringDeps: ", e);
        throw e;
    }
    return depsMap;
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
                const map = gatheringDeps(Path.resolve(this.options.buildPath + assetsMap[index[0]]), assetKeys);
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