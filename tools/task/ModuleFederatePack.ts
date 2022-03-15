import { cyan, green, red, yellow } from "colorette";
import DirectoryNamedWebpackPlugin from "directory-named-webpack-plugin";
import fs from "fs-extra";
import klaw from "klaw";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "path";
import webpack, { 
    container,
    type Compiler,
    type RuleSetRule,
    type WebpackPluginInstance
} from "webpack";
import FederationModuleIdPlugin from "webpack-federation-module-id-plugin";
import getGlobalConfig, { IGlobalConfig, devLocalIdentName, prodLocalIdentName } from "../getGlobalConfig";
import { ConfigHelper } from "../libs/ConfigHelper";
import Logger from "../libs/Logger";
import FederationStatsPlugin from "../libs/plugins/federation-stats-plugin";
import { WebpackTaskBase } from "../libs/WebpackTaskBase";
import { HelperTask } from "./HelperTask";

const log = Logger("ModuleFederatePack");

const esDepends = [
    "core-js/features/object",
    "core-js/features/array",
    "core-js/features/map",
    "core-js/features/set",
    "core-js/features/promise",
    "raf/polyfill",
];

const cssModuleRegExp = /[\\/]components?[\\/]|[\\/]pages?[\\/]|\.module\.(?:css|less|s[ac]ss)$/i;
export class ModuleFederatePack extends WebpackTaskBase {
    private clientEntrySrc = "src/isomorphic/moduleFederate";
    private globalConfig: IGlobalConfig;

    constructor(taskName = "ModuleFederatePack") {
        super(taskName);
        this.globalConfig = getGlobalConfig();
        this.src = path.resolve(`${this.rootPath}${this.clientEntrySrc}`);
        this.dist = path.resolve(`${this.rootPath}${this.globalConfig.clientOutput}/federate`);
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
        log.info("->", "ModuleFederatePack", HelperTask.taking());
        // log.info("ModuleFederatePack.pack.run", entry);
        // const mode = this.isDebugMode ? JSON.stringify("development") : JSON.stringify("production");
        const config: webpack.Configuration = {
            mode: this.getEnvDef(),
            // cache: true,
            // debug: true,
            entry: { "index": esDepends.concat(this.src), },
            devtool: this.isDebugMode ? "source-map" : undefined,
            output: {
                publicPath: "auto",
                path: this.dist,
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
            name: "ModuleFederatePack",
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
        try {
            await super.compile(config);
        } catch (e) {}
    }

    private getOptimization() {
        return {
            minimize: !this.isDebugMode,
            splitChunks: false,
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
        
        plugins.push(new MiniCssExtractPlugin({
            filename: "[name]_[contenthash:8].css",
            // chunkFilename: "[name]-chunk-[id]_[contenthash:8].css",
        }));
        plugins.push(new webpack.DefinePlugin(defineOption));

        // if (this.isDebugMode) {
        //     plugins.push(new webpack.HotModuleReplacementPlugin());
        // }
        const moduleFederationConfig = ConfigHelper.get("federation", false);
        if (moduleFederationConfig && moduleFederationConfig.exposes) {
            if (!moduleFederationConfig.name) {
                moduleFederationConfig.name = ConfigHelper.getPackageName();
            }
            if (!moduleFederationConfig.filename) {
                moduleFederationConfig.filename = "remoteEntry.js";
            }
            plugins.push(new FederationStatsPlugin());
            plugins.push(new FederationModuleIdPlugin());
            plugins.push(new container.ModuleFederationPlugin(moduleFederationConfig));
        }
        return plugins;
    }
}

export default ModuleFederatePack;
