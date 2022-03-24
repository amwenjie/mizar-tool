import webpack, { type Configuration } from "webpack";
import { merge } from "webpack-merge";
import nodeExternals from "webpack-node-externals";
import { type webpackPluginsType } from "../interface.js";
import ConfigHelper from "../libs/ConfigHelper.js";
import base from "./base.js";

function getPlugins(isDebugMode: boolean): webpackPluginsType {
    const plugins = [];
    const defineOption = {
        IS_SERVER_RUNTIME: JSON.stringify(true),
        IS_DEBUG_MODE: JSON.stringify(!!isDebugMode),
        DEV_PROXY_CONFIG: JSON.stringify(ConfigHelper.get("proxy", false)),
    };
    plugins.push(new webpack.DefinePlugin(defineOption));
    return plugins;
}

export default function serverBase(isDebugMode: boolean): Configuration {
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
        plugins: getPlugins(isDebugMode),
        externalsPresets: {
            node: true,
        },
        target: "node",
        optimization: {
            emitOnErrors: false
        },
    });
}