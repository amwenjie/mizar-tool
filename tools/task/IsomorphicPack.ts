import LoadablePlugin from "@loadable/webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import fs from "fs-extra";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "node:path";
import TerserJSPlugin from "terser-webpack-plugin";
import type { Configuration } from "webpack";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import { merge } from "webpack-merge";
import clientBase from "../config/client.base.js";
import sharePlugin from "../config/share.plugin.js";
import type { webpackPluginsType } from "../interface.js";
import ConfigHelper from "../libs/ConfigHelper.js";
import getGlobalConfig, { assetModuleFilename, type IGlobalConfig } from "../libs/getGlobalConfig.js";
import Logger from "../libs/Logger.js";
import { WebpackTaskBase } from "../libs/WebpackTaskBase.js";
import { HelperTask } from "./HelperTask.js";

const log = Logger("IsomorphicPack");

export class IsomorphicPack extends WebpackTaskBase {
    private clientEntrySrc = "src/isomorphic/index";
    private globalConfig: IGlobalConfig;

    constructor(taskName = "IsomorphicPack") {
        super(taskName);
        this.globalConfig = getGlobalConfig();
        this.src = path.resolve(`${this.rootPath}${this.clientEntrySrc}`);
        this.dist = path.resolve(`${this.rootPath}${this.globalConfig.clientOutput}`);
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

    private getPlugins(): webpackPluginsType[] {
        const plugins: webpackPluginsType[] = [];
        plugins.push(new MiniCssExtractPlugin({
            filename: this.isDebugMode ? "[name]_bundle.css" : "[name]_[contenthash:8].css",
            // chunkFilename: "[name]-chunk-[id]_[contenthash:8].css",
        }));
        if (fs.existsSync(path.resolve(this.rootPath, "src/public"))) {
            plugins.push(new CopyWebpackPlugin({
                patterns: [
                    {
                        context: "src",
                        from: "public/**/*",
                    },
                ],
            }));
        }
        plugins.push(...sharePlugin.remoteMfPlugin);
        const relativePath = path.relative(this.globalConfig.clientOutput, this.globalConfig.rootOutput);
        plugins.push(new LoadablePlugin({
            filename: `${relativePath}/loadable-stats.json`,
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

    protected async compile(): Promise<void | Error> {
        log.info("->", "IsomorphicPack", HelperTask.taking());
        const config: Configuration = {
            entry: {
                "index": this.src,
            },
            output: {
                chunkFilename: this.isDebugMode ? "[name]_chunk.js" : "[name]_[contenthash:8].js",
                publicPath: [
                    this.isDebugMode ? "/" : ConfigHelper.getCDN(),
                    this.globalConfig.publicPath,
                    "client/"
                ].join(""),
                filename: this.isDebugMode ? "[name]_bundle.js" : "[name]_[contenthash:8].js",
                path: this.dist,
                assetModuleFilename,
            },
            name: this.taskName,
            plugins: this.getPlugins(),
            optimization: this.getOptimization() as object,
        };
        if (this.isHotReload) {
            config.devServer = ConfigHelper.get("hotReload", {});
        }
        log.info("pack", { config: JSON.stringify(config) });
        await super.compile(config);
    }

    // protected getCompileConfig(conf: Configuration): Configuration {
    //     // const baseConf = merge({}, clientBase(this.isDebugMode));
    //     // if (this.isDebugMode) {
    //     //     baseConf.module.rules = baseConf.module.rules.slice(0);
    //     //     baseConf.module.rules.splice(2, 0, {
    //     //         test: /\.(?:css|less|s[ac]ss)$/i,
    //     //         exclude: /[\\/]node_modules[\\/]/i,
    //     //         loader: "alcor-loaders/typing-for-css-module",
    //     //     });
    //     // }

    //     // const innerConf = merge(baseConf, conf);
    //     // return innerConf;
    //     return merge({}, clientBase(this.isDebugMode), conf);
    // }

    public setHotReloadMode(isHotReload) {
        this.isHotReload = isHotReload;
        return this;
    }
}

export default IsomorphicPack;
