import DirectoryNamedWebpackPlugin from "directory-named-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import webpack, { 
    type Configuration,
} from "webpack";
import { merge } from "webpack-merge";
import {
    type webpackPluginsType,
    type webpackRulesType,
} from "../interface.js";
import ConfigHelper from "../libs/ConfigHelper.js";
import { devLocalIdentName, prodLocalIdentName } from "../libs/getGlobalConfig.js";
import { getCssModuleMode, shouldSourceModuled, } from "../libs/Utils.js";
import base from "./base.js";

function getCssLoaders(isDebugMode: boolean, extraLoaders = []): webpackRulesType {
    const loaders = [];
    loaders.push({
        loader: MiniCssExtractPlugin.loader,
    });
    let localIdentName = prodLocalIdentName;
    let sourceMap = false;
    if (isDebugMode) {
        localIdentName = devLocalIdentName;
        sourceMap = true;
    }
    return loaders.concat([
        {
            loader: "css-loader",
            options: {
                importLoaders: 1 + extraLoaders.length,
                sourceMap,
                modules: {
                    auto: shouldSourceModuled,
                    mode: getCssModuleMode,
                    localIdentName,
                    namedExport: true,
                },
            },
        },
        {
            loader: "postcss-loader",
            options: Object.assign(
                {
                    postcssOptions: {
                        plugins: [
                            "postcss-preset-env",
                        ],
                    },
                },
                ConfigHelper.get("postcss-loader", {}),
            ),
        },
    ], extraLoaders);
}

function getRules(isDebugMode: boolean): webpackRulesType {
    const rules: webpackRulesType = [];

    rules.push({
        exclude: /\.d\.ts$/i,
        test: /[\\/]src[\\/]isomorphic[\\/].+[\\/][A-Z][^\\/]+[\\/]index\.tsx?$/,
        loader: "alcor-loaders/connect-default-param-loader",
    });
    rules.push({
        test: /\.css$/i,
        use: getCssLoaders(isDebugMode),
        type: "javascript/auto",
    });
    rules.push({
        test: /\.less$/i,
        use: getCssLoaders(isDebugMode, [
            {
                loader: "less-loader",
                options: Object.assign(
                    {
                        sourceMap: isDebugMode,
                    },
                    ConfigHelper.get("less-loader", {}),
                ),
            },
        ]),
        type: "javascript/auto",
    });
    rules.push({
        test: /\.s[ac]ss$/i,
        use: getCssLoaders(isDebugMode, [
            {
                loader: "sass-loader",
                options: Object.assign(
                    {
                        sourceMap: isDebugMode,
                    },
                    ConfigHelper.get("sass-loader", {}),
                ),
            },
        ]),
        type: "javascript/auto",
    });
    rules.push({
        test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|swf)(\?.*)?$/i,
        type: "asset",
    });
    return rules;
}

function getPlugins(isDebugMode: boolean): webpackPluginsType {
    const plugins = [];
    const defineOption = {
        IS_SERVER_RUNTIME: JSON.stringify(false),
        IS_DEBUG_MODE: JSON.stringify(!!isDebugMode),
    };
    plugins.push(new webpack.DefinePlugin(defineOption));
    return plugins;
}

export default function clientBase(isDebugMode: boolean): Configuration {
    const idMode = isDebugMode ? "named" : "deterministic";
    return merge(base(isDebugMode), {
        externals: [({ context, request }, callback) => {
            const isExternal = /[\\/]server[\\/]/i.test(request);
            if (isExternal || request === "node-mocks-http") {
                callback(null, "''");
            } else {
                callback();
            }
        }],
        module: {
            rules: getRules(isDebugMode),
        },
        resolve: {
            plugins: [
                new DirectoryNamedWebpackPlugin(),
            ],
        },
        plugins: getPlugins(isDebugMode),
        optimization: {
            minimize: !isDebugMode,
            chunkIds: idMode,
            moduleIds: idMode,
        },
        target: ['web'],
    });
}