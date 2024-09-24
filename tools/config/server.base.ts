import webpack, { type Configuration } from "webpack";
import { merge } from "webpack-merge";
import nodeExternals from "webpack-node-externals";
import type { webpackPluginsType } from "../interface.js";
import ConfigHelper from "../libs/ConfigHelper.js";
import base from "./base.js";

function getPlugins(isDebugMode: boolean, isHotReload = false): webpackPluginsType[] {
    const plugins: webpackPluginsType[] = [];
    const devServer = Object.assign({
        host: "http://localhost",
        port: 9000,
    }, ConfigHelper.get("hotReload", {}));
    const defineOption: { [key: string]: any } = {
        IS_SERVER_RUNTIME: JSON.stringify(true),
        IS_DEBUG_MODE: JSON.stringify(!!isDebugMode),
        DEV_STATIC_HR_SERVE: JSON.stringify(!!(isDebugMode && isHotReload)),
    };
    if (isDebugMode) {
        const p = `/${ConfigHelper.getPublicPath()}client`;
        defineOption.DEV_PROXY_CONFIG = JSON.stringify((isHotReload ? [
            {
                "path": p,
                "config": {
                    "target": `${devServer.host}:${devServer.port}${p}`,
                }
            }
        ] : []).concat(ConfigHelper.get("proxy", []) as any));

    }
    plugins.push(new webpack.DefinePlugin(defineOption));
    return plugins;
}

export default function serverBase(isDebugMode: boolean, isHotReload = false): Configuration {
    return merge(base(isDebugMode), {
        externals: [
            nodeExternals({
                importType: "module",
                allowlist: [
                    /^mizar/,
                ],
            }),
        ],
        output: {
            filename: "[name].js",
            library: {
                type: "module",
            },
        },
        plugins: getPlugins(isDebugMode, isHotReload),
        experiments: {
            outputModule: true,
        },
        externalsType: "module",
        externalsPresets: {
            node: true,
        },
        target: "es2020",
        optimization: {
            emitOnErrors: false
        },
    });
}