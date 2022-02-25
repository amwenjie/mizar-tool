import { type IncomingMessage } from "http";
import fs from "fs-extra";
import { type Compiler } from "webpack";

function loadRemoteModule(fileName: string, base?: string) {
    let moduleUri = fileName;
    return new Promise((resolve, reject) => {
        if (base) {
            try {
                resolve(require(new URL(fileName, base).toString()));
            } catch (e) {
                reject(e);
            }
        } else {
            const reqMod = /^https\:/i.test(moduleUri) ? require('https') : require('http');
            reqMod.get(moduleUri, (res: IncomingMessage) => {
                if (res.statusCode === 200) {
                    const moduleContent = [];
                    res.setEncoding('utf8');
                    res.on('data', chunk => moduleContent.push(chunk));
                    res.on('end', () => {
                        resolve(moduleContent.join(""));
                    });
                } else {
                    reject(new Error(`load remote module response : status - ${res.statusCode} , msg: ${res.statusMessage}`));
                }
            }).on('error', err => reject(err))
        }
    });
}

function performRemoteUrl(remoteUrl) {
    const scriptUrl = remoteUrl.split("@")[1];
    const moduleName = remoteUrl.split("@")[0];
    return loadRemoteModule(scriptUrl).then(moduleContent => {
        // use eval, not choose vm, because:
        // runInNewContext is not meant to be used as a replacement of require or eval,
        // but instead as a way to create a sandbox environment where you can safely run other scripts.
        // Disadvantages are that it's slow (creation takes ~10 ms.) and takes up a couple megabytes.
        // So don't use it as a require replacement.

        const remoteModule = eval(`${moduleContent} \\n  try{ ${moduleName} } catch(e) { null; };`);
        return remoteModule;
    });
}


const getModuleProxyGenerator = (mfConfig) => `
    function generateModuleProxy(remote) {
        return {
            get: request => remote.get(request),
            init: args => {
                try {
                    return remote.init({
                        ...args,
                        ${Object.keys(mfConfig.shared || {})
                            .filter(item => 
                                mfConfig.shared[item].singleton && mfConfig.shared[item].requiredVersion
                            )
                            .map(function (item) {
                                return `"${item}": {
                        ["${mfConfig.shared[item].requiredVersion}"]: {
                            get: () => Promise.resolve().then(() => () => require("${item}"))
                        },
                    }`;
                            })
                            .join(",")}
                    });
                } catch(e) {
                    console.log("remote container already initialized");
                }
            },
        };
    }
`;

// function getModuleProxyGenerator(mfConfig) {
//     const singleton = {};
//     const shared = mfConfig.shared || {};
//     Object.keys(shared)
//         .forEach(item => {
//             if (shared[item].singleton && shared[item].requiredVersion) {
//                 singleton[item] = {};
//                 singleton[item][shared[item].requiredVersion] = {
//                     get: () => {
//                         return Promise.resolve().then(() => {
//                             return () => require(item);
//                         });
//                     },
//                 };
//             }
//         });
//     return function (remote) {
//         return {
//             get: request => remote.get(request),
//             init: args => {
//                 try {
//                     return remote.init({
//                         ...args,
//                         ...singleton,
//                     });
//                 } catch (e) {
//                     console.log("remote container already initialized");
//                 }
//             },
//         };
//     };
// }

function generateRemotesConfig(mfConf, getRemoteUri?) {
    return Object.entries(mfConf.remotes || {}).reduce((acc, [name, config]) => {
        acc[name] = {
            external: `external (async function() {
    ${loadRemoteModule.toString()}
    ${performRemoteUrl.toString()}
    ${getModuleProxyGenerator(mfConf)}
    return performRemoteUrl(${getRemoteUri
        ? `await ${getRemoteUri(config)}`
        : `"${config}"`})
        .then(generateModuleProxy).catch(err => console.error(err));
    }())`,
        };
        return acc;
    }, {});
}

export default class NodeModuleFederation {
    constructor(protected readonly options: any = {}) {
    }

    apply(compiler: Compiler) {
        const { getRemoteUri, ...options } = this.options;
        new (require("webpack/lib/container/ModuleFederationPlugin"))({
            ...options,
            remotes: generateRemotesConfig(options, getRemoteUri),
        }).apply(compiler);
    }
}