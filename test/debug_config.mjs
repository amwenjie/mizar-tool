import DirectoryNamedWebpackPlugin from "directory-named-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import ESLintWebpackPlugin from "eslint-webpack-plugin";
import StylelintPlugin from "stylelint-webpack-plugin";
import webpack from "webpack";
import LoadablePlugin from "@loadable/webpack-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import TerserJSPlugin from "terser-webpack-plugin";
import path from "path";

function checkIsLegalIdentifier(v) {
    /**
     * A JavaScript identifier must start with a letter, underscore (_), or dollar sign ($). Subsequent characters can also be digits (0–9).
     */
    return /^[$a-zA-z_][$a-zA-z_0-9]+$/.test(v);
}

const cssModuleRegExp = /[\\/]components?[\\/]|[\\/]pages?[\\/]|\.module\.(?:css|less|s[ac]ss)$/i;

function getCssModuleMode(resourcePath) {
    if (cssModuleRegExp.test(resourcePath)) {
        return "local";
    }
    return "global";
}

function shouldSourceModuled(resourcePath) {
    return cssModuleRegExp.test(resourcePath);
}

export default {
    "mode": "development",
    "devtool": "source-map",
    "plugins": [

        new StylelintPlugin({
            extensions: ["css", "less", "scss", "sass"],
            files: "./src",
        }),
        new ESLintWebpackPlugin({
            files: "./src",
            extensions: ["ts", "tsx", "js", "jsx", "mjs", "cjs"],
            failOnError: false,
            configType: "flat",
        }),
        new webpack.DefinePlugin({
            "IS_SERVER_RUNTIME": false,
            "IS_DEBUG_MODE": true
        }),
        new MiniCssExtractPlugin({
            filename: "[name]_bundle.css"
        }),
        new LoadablePlugin({
            filename: `../loadable-stats.json`,
            writeToDisk: true,
        }),
        // {
        //     "key": "StylelintWebpackPlugin",
        //     "options": {
        //         "cache": true,
        //         "cacheLocation": "node_modules/.cache/stylelint-webpack-plugin/.stylelintcache",
        //         "extensions": ["css", "less", "scss", "sass"],
        //         "emitError": true,
        //         "emitWarning": true,
        //         "failOnError": true,
        //         "files": "./src"
        //     },
        //     "startTime": 1726314229939,
        //     "prevTimestamps": {}
        // },
        // {
        //     "key": "ESLintWebpackPlugin",
        //     "options": {
        //         "cache": true,
        //         "cacheLocation": "node_modules/.cache/eslint-webpack-plugin/.eslintcache",
        //         "extensions": ["ts", "tsx", "js", "jsx", "mjs", "cjs"],
        //         "emitError": true,
        //         "emitWarning": true,
        //         "failOnError": false,
        //         "resourceQueryExclude": [],
        //         "files": "./src",
        //         "configType": "flat"
        //     }
        // },
        // {
        //     "definitions": {
        //         "IS_SERVER_RUNTIME": "false",
        //         "IS_DEBUG_MODE": "true"
        //     }
        // },
        // {
        //     "_sortedModulesCache": {},
        //     "options": {
        //         "filename": "[name]_bundle.css",
        //         "ignoreOrder": false,
        //         "runtime": true,
        //         "chunkFilename": "[name]_bundle.css"
        //     },
        //     "runtimeOptions": {
        //         "linkType": "text/css"
        //     }
        // },
        // {
        //     "opts": {
        //         "filename": "../loadable-stats.json",
        //         "writeToDisk": true,
        //         "outputAsset": true,
        //         "chunkLoadingGlobal": "__LOADABLE_LOADED_CHUNKS__"
        //     },
        //     "compiler": null
        // }
    ],
    "module": {
        "rules": [
            {
                exclude: /[\\/]node_modules[\\/]|\.d\.ts$/i,
                test: /\.tsx?$/i,
                "use": [
                    { "loader": "ts-loader" }
                ]
            },
            {
                exclude: /\.d\.ts$/i,
                test: /[\\/]src[\\/]isomorphic[\\/].+[\\/][A-Z][^\\/]+[\\/]index\.tsx?$/,
                "loader": "connect-param-inject-loader"
            },
            {
                "test": /\.css$/i,
                "use": [
                    {
                        loader: "css-module-typing-loader",
                    },
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    {
                        "loader": "css-loader",
                        options: {
                            esModule: true,
                            importLoaders: 1,
                            sourceMap: true,
                            modules: {
                                auto: shouldSourceModuled,
                                mode: getCssModuleMode,
                                exportLocalsConvention: "camel-case-only",
                                "localIdentName": "[path][name]__[local]_[contenthash:8]",
                                namedExport: true,
                            },
                        },
                    },
                    {
                        "loader": "postcss-loader",
                        "options": {
                            "postcssOptions": {
                                "plugins": ["postcss-preset-env"]
                            }
                        }
                    }
                ],
                "type": "javascript/auto"
            },
            {
                "test": /\.less$/i,
                "use": [
                    {
                        loader: "css-module-typing-loader",
                    },
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    {
                        "loader": "css-loader",
                        options: {
                            esModule: true,
                            importLoaders: 2,
                            sourceMap: true,
                            modules: {
                                auto: shouldSourceModuled,
                                mode: getCssModuleMode,
                                exportLocalsConvention: "camel-case-only",
                                "localIdentName": "[path][name]__[local]_[contenthash:8]",
                                namedExport: true,
                            },
                        },
                    },
                    {
                        "loader": "postcss-loader",
                        "options": {
                            "postcssOptions": {
                                "plugins": ["postcss-preset-env"]
                            }
                        }
                    },
                    {
                        "loader": "less-loader",
                        "options": { "sourceMap": true }
                    },
                ],
                "type": "javascript/auto"
            },
            {
                test: /\.s[ac]ss$/i,
                "use": [
                    {
                        loader: "css-module-typing-loader",
                    },
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    {
                        "loader": "css-loader",
                        options: {
                            esModule: true,
                            importLoaders: 2,
                            sourceMap: true,
                            modules: {
                                auto: shouldSourceModuled,
                                mode: getCssModuleMode,
                                exportLocalsConvention: "camel-case-only",
                                "localIdentName": "[path][name]__[local]_[contenthash:8]",
                                namedExport: true,
                            },
                        },
                    },
                    {
                        "loader": "postcss-loader",
                        "options": {
                            "postcssOptions": {
                                "plugins": ["postcss-preset-env"]
                            }
                        }
                    },
                    {
                        "loader": "sass-loader",
                        "options": {
                            "sourceMap": true
                        }
                    }
                ],
                "type": "javascript/auto"
            },
            {
                test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|swf)(\?.*)?$/i,
                "type": "asset"
            },
        ]
    },
    "resolve": {
        "extensions": [".ts", ".tsx", ".js", ".jsx", ".css", ".png", ".jpg", ".gif", ".less", "sass", "scss", "..."],
        "modules": [
            "node_modules", "G:\\\\work\\\\test-project\\\\src"
        ],
        plugins: [
            new DirectoryNamedWebpackPlugin(),
        ],
    },
    "resolveLoader": {
        "modules": ["node_modules",path.resolve(__dirname, 'tools/libs/loaders')]
    },
    "externals": [({ context, request }, callback) => {
        const isExternal = /[\\/]server[\\/]/i.test(request);
        if (isExternal || request === "node-mocks-http") {
            callback(null, "''");
        } else {
            callback();
        }
    }],
    "optimization": {
        "minimize": false,
        "chunkIds": "named",
        "moduleIds": "named",
        runtimeChunk: {
            name: "runtime",
        },
        splitChunks: {
            // chunks: "all",
            cacheGroups: {
                libBase: {
                    test: /[\\/](?:core-js|raf|react(?:-[^\\/]+)?|redux(?:-[^\\/]+)?)[\\/]/,
                    name: "lib",
                    priority: 30,
                    chunks: "all",
                    // maxSize: 204800,
                },
                nmDeps: {
                    test: /[\\/]node_modules[\\/]/,
                    name: "nmdeps",
                    priority: 20,
                    chunks: "all",
                    reuseExistingChunk: true,
                    // maxSize: 204800,
                },
                common: {
                    name: "common",
                    minChunks: 2,
                    chunks: "initial",
                    reuseExistingChunk: true,
                },
            },
        },
        "minimizer": [
            new TerserJSPlugin({
                terserOptions: {
                    format: {
                        comments: false,
                    },
                },
                extractComments: false,
            }),
            new CssMinimizerPlugin(),
        ]
    },
    "target": ["web"],
    "entry": {
        "index": "G:\\\\work\\\\test-project\\\\src\\\\isomorphic\\\\index"
    },
    "output": {
        "chunkFilename": "[name]_chunk.js",
        "publicPath": "/client/",
        "filename": "[name]_bundle.js",
        "path": "G:\\\\work\\\\test-project\\\\dist\\\\client",
        "assetModuleFilename": "assets/[name]_[contenthash][ext][query]"
    },
    "name": "IsomorphicPack"
};