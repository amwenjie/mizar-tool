// fork from https://github.com/DanielAmenou/webpack-federation-stats-plugin
import webpack, { type Compiler } from "webpack";
import type { ModuleFederationPluginOptions } from "webpack/lib/container/ModuleFederationPlugin";

const PLUGIN_NAME = "FederationStatsPlugin";

const EXTENSION_REGEX = /\.[^/.]+$/;

export default class FederationStatsPlugin {
    entryKeys: string[];

    constructor(protected readonly options = { fileName: "federation-stats.json" }) {
    }

    apply(compiler: Compiler) {
        const federationPlugin: any = compiler.options.plugins?.find((plugin) => plugin.constructor.name === "ModuleFederationPlugin");

        if (!federationPlugin) {
            throw new Error("No ModuleFederationPlugin found.");
        }

        const appName = federationPlugin._options.name;

        // get exposed modules from the ModuleFederationPlugin
        const exposedFiles = new Map(
            Object.entries(federationPlugin._options.exposes || {})
                .map(
                    ([k, v]: [string, ModuleFederationPluginOptions]) => (typeof v === "object" ? [v.import, k] : [v, k])
                )
        );

        compiler.hooks.thisCompilation.tap(PLUGIN_NAME, compilation => {
            compilation.hooks.processAssets.tapPromise(
                {
                    name: PLUGIN_NAME,
                    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
                },
                async () => {
                    const stats = compilation.getStats().toJson({});
                    // find mf modules
                    const mfModules = stats.modules.filter(
                        (module) => module.issuerName === "container entry" && exposedFiles.has(module.name.replace(EXTENSION_REGEX, ""))
                    );

                    const chunksReducer = (chunksArr, current) => {
                        current.siblings.forEach(s => {
                            const chunk = stats.chunks.find((c) => c.id === s);
                            chunk.files.forEach(f => chunksArr.push(f));
                        })
                        current.files.forEach(f => chunksArr.push(f));
                        return chunksArr;
                    }

                    const chunks = mfModules.map(module => {
                        const exposedAs = exposedFiles.get(module.name.replace(EXTENSION_REGEX, ""));
                        const chunks = module.chunks
                            .map(
                                chunkId => stats.chunks.find(
                                    chunk => chunk.id === chunkId
                                )
                            )
                            .filter(chunk => chunk.runtime.includes(appName))
                            .reduce(chunksReducer, []);
                        return {
                            module: exposedAs,
                            chunks: chunks,
                            id: module.id,
                        };
                    });

                    const exposes = chunks.reduce(
                        (result, current) => Object.assign(result, {
                            [current.module.replace("./", "")]: current.chunks,
                        }),
                        {}
                    );
                    const name = (federationPlugin._options.library && federationPlugin._options.library.name)
                        || federationPlugin._options.name;

                    const statsResult = {
                        name,
                        exposes,
                    };

                    const fileName = this.options.fileName;
                    const statsBuffer = Buffer.from(JSON.stringify(statsResult), "utf-8");
                    const mfStats = {
                        source: () => statsBuffer,
                        size: () => statsBuffer.length,
                    };

                    const asset = compilation.getAsset(fileName);
                    if (asset) {
                        compilation.updateAsset(fileName, webpack.sources.CompatSource.from(mfStats));
                    } else {
                        compilation.emitAsset(fileName, webpack.sources.CompatSource.from(mfStats));
                    }
                }
            );
        });
    }
}