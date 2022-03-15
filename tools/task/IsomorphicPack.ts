import LoadablePlugin from "@loadable/webpack-plugin";
import { cyan, green, red, yellow } from "colorette";
import CopyWebpackPlugin from "copy-webpack-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import DirectoryNamedWebpackPlugin from "directory-named-webpack-plugin";
import ESLintWebpackPlugin from "eslint-webpack-plugin";
import fs from "fs-extra";
import klaw from "klaw";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "path";
import StylelintPlugin from "stylelint-webpack-plugin";
import TerserJSPlugin from "terser-webpack-plugin";
import webpack, { 
    container,
    type Compiler,
    type RuleSetRule,
    type WebpackPluginInstance,
} from "webpack";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import getGlobalConfig, { IGlobalConfig, devLocalIdentName, prodLocalIdentName } from "../getGlobalConfig";
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

const cssModuleRegExp = /[\\/]components?[\\/]|[\\/]pages?[\\/]|\.module\.(?:css|less|s[ac]ss)$/i;
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

    private getCssModuleMode(resourcePath: string): "global" | "local" {
        if (cssModuleRegExp.test(resourcePath)) {
            return "local";
        }
        return "global";
    }

    private shouldSourceModuled(resourcePath: string): boolean {
        return cssModuleRegExp.test(resourcePath);
    }

    protected async compile(): Promise<void|Error> {
        log.info("->", "IsomorphicPack", HelperTask.taking());
        const config: webpack.Configuration = {
            mode: this.getEnvDef(),
            // cache: true,
            // debug: true,
            devtool: this.isDebugMode ? "source-map" : undefined,
            entry: { "index": esDepends.concat(this.src), },
            output: {
                chunkFilename: "[name]_[contenthash:8].js",
                publicPath: this.publicPath,
                filename: "[name]_[contenthash:8].js",
                path: this.dist,
                assetModuleFilename: "assets/[name]_[contenthash:8][ext][query]",
            },
            externals: ({ context, request }, callback) => {
                const isExternal = /[\\/]server[\\/]/i.test(request);
                if (isExternal || request === "node-mocks-http") {
                    callback(null, "''");
                } else {
                    callback();
                }
            },
            module: {
                rules: this.getRules(),
            },
            name: "IsomorphicPack",
            plugins: this.getPlugins(),
            resolve: {
                extensions: [".ts", ".tsx", ".js", ".css", ".png", ".jpg", ".gif", ".less", "sass", "scss", "..."],
                modules: [
                    path.resolve(__dirname, "src"),
                    "node_modules",
                ],
                plugins: [
                    new DirectoryNamedWebpackPlugin(),
                ],
            },
            optimization: this.getOptimization() as any,
        };
        log.info("pack", { config: JSON.stringify(config) });
        await super.compile(config);
    }

    private getOptimization() {
        return {
            minimize: !this.isDebugMode,
            chunkIds: this.isDebugMode ? "named" : "deterministic",
            moduleIds: this.isDebugMode ? "named" : "deterministic",
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

    private getCssLoaders(extraLoaders = []) {
        const loaders = [];
        loaders.push({
            loader: MiniCssExtractPlugin.loader,
        });
        let localIdentName = prodLocalIdentName;
        let sourceMap = false;
        if (this.isDebugMode) {
            localIdentName = devLocalIdentName;
            sourceMap = true;

            loaders.push(
                {
                    loader: path.resolve(__dirname, "../libs/loaders/typing-for-css-module"),
                }
            );
        }
        return loaders.concat([
            {
                loader: "css-loader",
                options: {
                    importLoaders: 1 + extraLoaders.length,
                    sourceMap,
                    modules: {
                        auto: this.shouldSourceModuled,
                        mode: this.getCssModuleMode,
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

    private getRules(): (RuleSetRule | "...")[] {
        const tslintPath = path.resolve(`${this.rootPath}tslint.json`);
        const tsConfigPath = path.resolve(`${this.rootPath}tsconfig.json`);
        const rules = [];
        const tslintConfig = ConfigHelper.get("tslint", true);
        if (tslintConfig) {
            rules.push({
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
            use: this.getCssLoaders(),
            type: "javascript/auto",
        });
        rules.push({
            test: /\.less$/i,
            use: this.getCssLoaders([
                {
                    loader: "less-loader",
                    options: Object.assign(
                        {
                            sourceMap: this.isDebugMode,
                        },
                        ConfigHelper.get("less-loader", {}),
                    ),
                },
            ]),
            type: "javascript/auto",
        });
        rules.push({
            test: /\.s[ac]ss$/i,
            use: this.getCssLoaders([
                {
                    loader: "sass-loader",
                    options: Object.assign(
                        {
                            sourceMap: this.isDebugMode,
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

    private getEnvDef(): "development"|"production" {
        return this.isDebugMode ? "development" : "production";
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
        plugins.push(new webpack.DefinePlugin(defineOption));

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
            ]
        }));
        // if (this.isDebugMode) {
        //     plugins.push(new webpack.HotModuleReplacementPlugin());
        // }
        const moduleFederationConfig = ConfigHelper.get("federation", false);
        if (moduleFederationConfig && moduleFederationConfig.remotes) {
            delete moduleFederationConfig.exposes;
            delete moduleFederationConfig.filename;
            delete moduleFederationConfig.name;
            plugins.push(new container.ModuleFederationPlugin(moduleFederationConfig));
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
}

export default IsomorphicPack;
