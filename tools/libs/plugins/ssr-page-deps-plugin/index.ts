import fs from "fs-extra";
import getGlobalConfig from "../../../getGlobalConfig";
import { type Compilation, type Stats } from "webpack";
// import { getCompilerHooks } from "webpack-manifest-plugin";

const pluginName = "SSRPageDepsPlugin";
const pageReg = /[\\/]src[\\/]isomorphic[\\/](pages(?:[\\/][A-Z][^\\/]*){1})[\\/]index\.tsx?/;
const clientRouterReg = /[\\/]src[\\/]isomorphic[\\/](pageRouters(?:[\\/][^\\/]+?){1})\.tsx?/;

interface IOptions {
    IS_SERVER_RUNTIME: boolean;
}

interface IDepsMap {
    [key: string]: {
        [key: string]: string[];
    }
}

function getChunkId(chunk) {
    return chunk.names[0] || chunk.id;
}

export default class GatherPageDepsPlugin {
    entryKeys: string[];
    constructor(protected readonly options: IOptions = { IS_SERVER_RUNTIME: false }) {
    }
    apply(compiler) {
        compiler.hooks.entryOption.tap(pluginName, (context, entry) => {
            this.entryKeys = Object.keys(entry || {
                index: ""
            });
        });
        compiler.hooks.emit.tapAsync(pluginName, (compilation: Compilation, callback = () => {}) => {
            const depsMap = this.flatDeps(compilation.getStats());
            fs.writeJSON(getGlobalConfig().rootOutput + "/pageAssetsDeps.json", depsMap, { spaces: "  " });
            callback();
        });
    }

    flatDeps(stats: Stats): {[key: string]: string[]} {
        const deps = this.gatherDeps(stats);
        const depsMap: {[key: string]: string[]} = {};
        Object.values(deps).forEach(v => {
            Object.keys(v).forEach(p => {
                const pageKey = p.replace(/^pages\//, "page/");
                if (depsMap[pageKey]) {
                    depsMap[pageKey] = depsMap[pageKey].concat(v[p]);
                } else {
                    depsMap[pageKey] = v[p];
                }
            })
        });
        return depsMap;
    }

    gatherDeps(stats: Stats): IDepsMap {
        const statsJson = stats.toJson()
        const depsMap: IDepsMap  = {};
        const entryChunk = statsJson.chunks.filter(c => this.entryKeys.includes(getChunkId(c)));
        const restChunk = statsJson.chunks.filter(c => !this.entryKeys.includes(getChunkId(c)));
        entryChunk.forEach(c => {
            const routerDeps = {};
            const cid = getChunkId(c);
            depsMap[cid] = routerDeps;
            c.modules.forEach(m => {
                if (pageReg.test(m.identifier)) {
                    const page = pageReg.exec(m.identifier)[1];
                    if (routerDeps[page]) {
                        routerDeps[page].push(cid);
                    } else {
                        routerDeps[page] = [cid];
                    }
                }
            });
        });
        restChunk.forEach(c => {
            const cid = getChunkId(c);
            c.modules.forEach(m => {
                if (pageReg.test(m.identifier)) {
                    const page = pageReg.exec(m.identifier)[1];
                    let routerDeps;
                    const parentC = entryChunk.filter(pc => Array.isArray(pc.children) && pc.children.includes(cid));
                    if (parentC.length) {
                        parentC.forEach(pc => {
                            const pcid = getChunkId(pc);
                            routerDeps = depsMap[pcid];
                            if (routerDeps[page]) {
                                routerDeps[page].push(cid);
                            } else {
                                routerDeps[page] = [cid];
                            }
                            routerDeps[page].push(pcid);
                        });
                    } else {
                        routerDeps = {};
                        depsMap[cid] = routerDeps;
                        if (routerDeps[page]) {
                            routerDeps[page].push(cid);
                        } else {
                            routerDeps[page] = [cid];
                        }
                    }
                }
            });
        });
        return depsMap;
    }
}