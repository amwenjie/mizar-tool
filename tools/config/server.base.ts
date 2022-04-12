import webpack, { type Configuration } from "webpack";
import { merge } from "webpack-merge";
import nodeExternals from "webpack-node-externals";
import { type webpackPluginsType } from "../interface.js";
import ConfigHelper from "../libs/ConfigHelper.js";
import base from "./base.js";

function getPlugins(isDebugMode: boolean, isHotReload = false): webpackPluginsType[] {
    const plugins: webpackPluginsType[] = [];
    const devServer = Object.assign({
        host: "http://localhost",
        port: 9000,
    }, ConfigHelper.get("hotReload", {}));
    const defineOption: {[key: string]: any} = {
        IS_SERVER_RUNTIME: JSON.stringify(true),
        IS_DEBUG_MODE: JSON.stringify(!!isDebugMode),
        DEV_STATIC_HR_SERVE: JSON.stringify(!!isHotReload),
    };
    if (isDebugMode) {
        defineOption.DEV_PROXY_CONFIG = JSON.stringify((isHotReload ? [
            {
                "path": `/${ConfigHelper.getPublicPath()}client/`,
                "config": {
                    "target": `${devServer.host}:${devServer.port}`,
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
                allowlist: [
                    /^mizar/,
                ],
            }),
        ],
        output: {
            filename: "[name].js",
            library: {
                type: "commonjs2",
            },
        },
        plugins: getPlugins(isDebugMode, isHotReload),
        externalsPresets: {
            node: true,
        },
        target: "node",
        optimization: {
            emitOnErrors: false
        },
    });
}