import LoadablePlugin from "@loadable/webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import fs from "fs-extra";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "path";
import TerserJSPlugin from "terser-webpack-plugin";
import { type Configuration } from "webpack";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import { merge } from "webpack-merge";
import clientBase from "../config/client.base.js";
import sharePlugin from "../config/share.plugin.js";
import { type webpackPluginsType } from "../interface.js";
import ConfigHelper from "../libs/ConfigHelper.js";
import getGlobalConfig, { assetModuleFilename, type IGlobalConfig } from "../libs/getGlobalConfig.js";
import Logger from "../libs/Logger.js";
import { WebpackTaskBase } from "../libs/WebpackTaskBase.js";
import { HelperTask } from "./HelperTask.js";

const log = Logger("IsomorphicPack");

const esDepends = [
    "core-js/features/object",
    "core-js/features/array",
    "core-js/features/map",
    "core-js/features/set",
    "core-js/features/promise",
    "raf/polyfill",
];
export class IsomorphicPack extends WebpackTaskBase {
    private clientEntrySrc = "src/isomorphic/index";
    private globalConfig: IGlobalConfig;
    private publicPath = "";

    constructor(taskName = "IsomorphicPack") {
        super(taskName);
        this.globalConfig = getGlobalConfig();
        this.src = path.resolve(`${this.rootPath}${this.clientEntrySrc}`);
        this.dist = path.resolve(`${this.rootPath}${this.globalConfig.clientOutput}`);
        this.publicPath = this.getPublicPath();
    }

    private getPublicPath() {
        const path = [
            this.isDebugMode ? "/" : ConfigHelper.getCDN(),
            this.globalConfig.publicPath,
            'client/'
        ].join("");
        log.info("isomorphicPack getPublicPath: ", path);
        return path;
    }

    private getOptimization() {
        return {
            runtimeChunk: {
                name: "runtime",
            },
            splitChunks: {
                // chunks: "all",
                cacheGroups: {
                    libBase: {
                        test: /[\\/](?:core\-js|raf|react(?:\-[^\\/]+)?|redux(?:\-[^\\/]+)?)[\\/]/,
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
            minimizer: [
                new TerserJSPlugin({
                    terserOptions: {
                        format: {
                            comments: false,
                        },
                    },
                    extractComments: false,
                }),
                new CssMinimizerPlugin(),
            ],
        };
    }

    private getPlugins(): webpackPluginsType {
        const plugins: webpackPluginsType = [];
        plugins.push(new MiniCssExtractPlugin({
            filename: "[name]_[contenthash:8].css",
            // chunkFilename: "[name]-chunk-[id]_[contenthash:8].css",
        }));
        plugins.push(new CopyWebpackPlugin({
            patterns: [
                {
                    context: "src",
                    from: "public/**/*",
                },
            ],
        }));
        // if (this.isDebugMode) {
        //     plugins.push(new webpack.HotModuleReplacementPlugin());
        // }
        plugins.push(...sharePlugin.remoteMfPlugin);
        plugins.push(new LoadablePlugin({
            filename: "./loadable-stats.json",
            writeToDisk: true,
        }));
        if (this.isAnalyzMode) {
            plugins.push(new BundleAnalyzerPlugin({
                analyzerMode: this.isDebugMode ? "server" : "disabled",
                generateStatsFile: !this.isDebugMode,
                openAnalyzer: !!this.isDebugMode,
            }));
        }
        return plugins;
    }

    protected async compile(): Promise<void|Error> {
        log.info("->", "IsomorphicPack", HelperTask.taking());
        const config: Configuration = await this.getCompileConfig();
        log.info("pack", { config: JSON.stringify(config), });
        await super.compile(config);
    }

    protected async getCompileConfig(): Promise<Configuration>  {
        const baseConf = clientBase(this.isDebugMode);
        if (this.isDebugMode) {
            baseConf.module.rules.splice(1, 0, {
                test: /\.(?:css|less|s[ac]ss)$/i,
                exclude: /[\\/]node_modules[\\/]/i,
                loader: "alcor-loaders/typing-for-css-module",
            });
        }

        const innerConf = merge(baseConf, {
            entry: { "index": esDepends.concat(this.src), },
            output: {
                chunkFilename: "[name]_[contenthash:8].js",
                publicPath: this.publicPath,
                filename: "[name]_[contenthash:8].js",
                path: this.dist,
                assetModuleFilename,
            },
            name: this.taskName,
            plugins: this.getPlugins(),
            optimization: this.getOptimization() as any,
        });
        
        const cuzConfigPath = path.resolve("./webpack.config/client.js");
        if (fs.existsSync(cuzConfigPath)) {
            const cuzConf: (conf: Configuration) => Configuration = (await import(cuzConfigPath)).default;
            if (typeof cuzConf === "function") {
                return merge(innerConf, cuzConf(innerConf));
            }
        }
        return innerConf;
    }
}

export default IsomorphicPack;
