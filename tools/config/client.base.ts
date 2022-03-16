import DirectoryNamedWebpackPlugin from "directory-named-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "path";
import { 
    type Configuration,
    type RuleSetRule,
} from "webpack";
import { merge } from "webpack-merge";
import { devLocalIdentName, prodLocalIdentName } from "../getGlobalConfig";
import { ConfigHelper } from "../libs/ConfigHelper";
import base from "./base";

const cssModuleRegExp = /[\\/]components?[\\/]|[\\/]pages?[\\/]|\.module\.(?:css|less|s[ac]ss)$/i;

function getCssModuleMode(resourcePath: string): "global" | "local" {
    if (cssModuleRegExp.test(resourcePath)) {
        return "local";
    }
    return "global";
}

function shouldSourceModuled(resourcePath: string): boolean {
    return cssModuleRegExp.test(resourcePath);
}

function getCssLoaders(isDebugMode: boolean, extraLoaders = []) {
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

function getRules(isDebugMode: boolean): (RuleSetRule | "...")[] {
    const rules = [];

    rules.push({
        exclude: /[\\/]node_modules[\\/]|\.d\.ts$/i,
        test: /\.tsx?$/i,
        use: [
            {
                loader: "ts-loader",
                options: {
                    compilerOptions: {
                        declaration: false,
                    },
                },
            },
        ],
    });
    rules.push({
        exclude: /\.d\.ts$/i,
        test: /[\\/]src[\\/]isomorphic[\\/]routers(?:[\\/][^\\/]+?){1}\.tsx?$/,
        use: [
            {
                loader: path.resolve(__dirname, "../libs/loaders/router-loadable-loader"),
            },
        ],
    });
    rules.push({
        exclude: /\.d\.ts$/i,
        test: /[\\/]src[\\/]isomorphic[\\/].+[\\/][A-Z][^\\/]+[\\/]index\.tsx?$/,
        use: [
            {
                loader: path.resolve(__dirname, "../libs/loaders/connect-default-param-loader"),
            },
        ],
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
        optimization: {
            minimize: !isDebugMode,
            chunkIds: idMode,
            moduleIds: idMode,
        },
    });
}