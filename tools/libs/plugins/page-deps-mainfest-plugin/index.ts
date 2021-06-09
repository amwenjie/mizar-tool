import fs from "fs-extra";
import Path from "path";

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
        const depRegexp = /component\:[^\[]+loader\:[^\[]+Promise\.all\([^\[]*?\[([^\]]+)\][\s\S]*?name\:\s*"([^"]+)"/g;
        let dependencies = depRegexp.exec(fileContent);
        while (dependencies) {
            const regexp = /\(([^)]+)\)/g;
            const pageDeps = dependencies[1];
            let matched = regexp.exec(pageDeps);
            const deps = [];
            while (matched) {
                if (assetsKeys.some(k => {
                    return (new RegExp(matched[1] + "_.{8}\\.css$")).test(k)
                })) {
                    deps.push(matched[1]);
                }
                matched = regexp.exec(pageDeps);
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