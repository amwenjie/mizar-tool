import LoadablePlugin from "@loadable/webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import ESLintWebpackPlugin from "eslint-webpack-plugin";
import fs from "fs-extra";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "path";
import StylelintPlugin from "stylelint-webpack-plugin";
import TerserJSPlugin from "terser-webpack-plugin";
import { 
    container,
    DefinePlugin,
    type Configuration,
    type Compiler,
    type WebpackPluginInstance,
} from "webpack";
import { merge } from "webpack-merge";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import clientBase from "../config/client.base";
import getGlobalConfig, { type IGlobalConfig } from "../libs/getGlobalConfig";
import { ConfigHelper } from "../libs/ConfigHelper";
import Logger from "../libs/Logger";
import { WebpackTaskBase } from "../libs/WebpackTaskBase";
import { HelperTask } from "./HelperTask";

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

    private getPlugins(): (
		| ((this: Compiler, compiler: Compiler) => void)
		| WebpackPluginInstance
	)[] {
        const defineOption = {
            IS_SERVER_RUNTIME: JSON.stringify(false),
            IS_DEBUG_MODE: JSON.stringify(!!this.isDebugMode),
        };

        const plugins = [];
        const stylelintConfig = ConfigHelper.get("stylelint", {
            extensions: ["css", "less", "scss", "sass"],
            files: "./src",
        });
        log.info("stylelintConfig: ", stylelintConfig);
        if (stylelintConfig) {
            plugins.push(new StylelintPlugin(stylelintConfig));
        }
        plugins.push(new DefinePlugin(defineOption));

        const esLintConfig = ConfigHelper.get("eslint", {
            files: "./src",
            failOnError: !this.isDebugMode,
        });
        log.info("esLintConfig: ", esLintConfig);
        if (esLintConfig) {
            plugins.push(new ESLintWebpackPlugin(esLintConfig));
        }

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
        const moduleFederationConfig = ConfigHelper.get("federation", false);
        if (moduleFederationConfig && moduleFederationConfig.remotes) {
            plugins.push(new container.ModuleFederationPlugin({
                remotes: moduleFederationConfig.remotes,
            }));
        }
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
        const config: Configuration = this.getCompileConfig();
        log.info("pack", { config: JSON.stringify(config), });
        await super.compile(config);
    }

    protected getCompileConfig(): Configuration  {
        const baseConf = clientBase(this.isDebugMode);
        if (this.isDebugMode) {
            baseConf.module.rules.splice(1, 0, {
                loader: path.resolve(__dirname, "../libs/loaders/typing-for-css-module"),
            });
        }
        const tslintPath = path.resolve(`${this.rootPath}tslint.json`);
        const tsConfigPath = path.resolve(`${this.rootPath}tsconfig.json`);
        const tslintConfig = ConfigHelper.get("tslint", true);
        if (tslintConfig) {
            baseConf.module.rules.unshift({
                exclude: /[\\/]node_modules[\\/]|\.d\.ts$/i,
                test: /\.tsx?$/i,
                enforce: "pre",
                loader: "tslint-loader",
                options: {
                    configFile: fs.existsSync(tslintPath) ? tslintPath : "",
                    tsConfigFile: fs.existsSync(tsConfigPath) ? tsConfigPath : "",
                },
            });
        }

        const innerConf = merge(baseConf, {
            entry: { "index": esDepends.concat(this.src), },
            output: {
                chunkFilename: "[name]_[contenthash:8].js",
                publicPath: this.publicPath,
                filename: "[name]_[contenthash:8].js",
                path: this.dist,
                assetModuleFilename: "assets/[name]_[contenthash:8][ext][query]",
            },
            name: this.taskName,
            plugins: this.getPlugins(),
            optimization: this.getOptimization() as any,
        });
        
        const cuzConfigPath = path.resolve("./webpack.config/client.js");
        if (fs.existsSync(cuzConfigPath)) {
            const cuzConf: () => Configuration = require(cuzConfigPath);
            if (typeof cuzConf === "function") {
                return merge(innerConf, cuzConf());
            }
        }
        return innerConf;
    }
}

export default IsomorphicPack;
