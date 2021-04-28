import * as CopyWebpackPlugin from "copy-webpack-plugin";
import * as CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import * as DirectoryNamedWebpackPlugin from "directory-named-webpack-plugin";
import * as MiniCssExtractPlugin from "mini-css-extract-plugin";
import * as TerserJSPlugin from "terser-webpack-plugin";
import * as UglifyJS from "uglify-js";
import * as CleanCSS from "clean-css";
import { WebpackManifestPlugin } from "webpack-manifest-plugin";
import * as fs from "fs-extra";
import * as klaw from "klaw";
import * as Path from "path";
import * as webpack from "webpack";
import * as yargs from "yargs";
import { hideBin } from "yargs/helpers";
import getGlobalConfig, { IGlobalConfig, devLocalIdentName, prodLocalIdentName } from "../getGlobalConfig";
import { ConfigHelper } from "../libs/ConfigHelper";
import Logger from "../libs/Logger";
import { WebpackTaskBase } from "../libs/WebpackTaskBase";
import { HelperTask } from "./HelperTask";
const argv = yargs(hideBin(process.argv)).argv;

let logCtg;
if (argv.verbose) {
    logCtg = "all";
} else if (argv.debug) {
    logCtg = "debug";
}
const log = Logger(logCtg);
export class IsomorphicPack extends WebpackTaskBase {
    public rootPath: string = "./";
    public src = "src/isomorphic/clientEntries";
    public vendorModel: boolean = false;
    private tslintConfig = null;
    private globalConfig: IGlobalConfig;
    private publicPath = "";
    private outputPath = "";
    private argv = null;
    constructor() {
        super();
        this.setTaskName("IsomorphicPack");
    }

    private getPublicPath() {
        const path = [
            this.watchModel ? "/" : ConfigHelper.getCDN(),
            this.globalConfig.publicPath,
            'client/'
        ].join("");
        log.info("isomorphicPack getPublicPath: ", path);
        return path;
    }

    // public setWatchModel(watchModel: boolean) {
    //     this.watchModel = watchModel;
    //     return this;
    // }
    public setVendorModel(vendorModel: boolean) {
        this.vendorModel = vendorModel;
        return this;
    }
    public async run() {
        this.globalConfig = getGlobalConfig();
        this.tslintConfig = ConfigHelper.get("tslint", { disable: false });
        this.publicPath = this.getPublicPath();
        this.outputPath = `${this.rootPath}${this.globalConfig.clientOutput}`;

        log.info("->", "IsomorphicPack", HelperTask.taking());
        try {
            const entry = await this.scan();
            if (!entry || Object.keys(entry).length === 0) {
                return;
            }
            log.debug(this.taskName, "run.entry", entry);
            await this.pack(entry);
        } catch (error) {
            log.error(this.taskName, "FATAL_ERROR", error.message);
            throw error;
        }
    }

    /**
     * 入口文件搜寻
     */
    private async scan() {
        return new Promise((resolve, reject) => {
            const react16Depends = ["core-js/features/map", "core-js/features/set"];
            const entries = {};
            const entryDir = this.rootPath + this.src;
            if (!fs.existsSync(entryDir)) {
                log.warn("isomorphic pack build入口目录不存在：", entryDir);
                resolve({});
                return;
            }
            const walk = klaw(entryDir);
            walk.on("data", (state) => {
                const src = state.path;
                if (/\.ts|\.tsx|\.js/.test(src)) {
                    const dirName = src.replace(Path.resolve(this.rootPath), "")
                        .replace(".tsx", "")
                        .replace(".ts", "")
                        .replace(/\\/g, "/")
                        .replace("/" + this.src + "/", "");
                    entries[dirName] = [...react16Depends, src];
                }
            });
            walk.on("end", () => {
                log.debug("IsomorphicPack.scan.end", Path.resolve(this.rootPath));
                log.debug("IsomorphicPack.pack.keys", Object.keys(entries).join(","));
                resolve(entries);
            });
            walk.on("error", (error) => {
                reject(error);
            });
        });
    }

    private shouldSourceModuled(resourcePath: string): boolean {
        // log.debug('resourcePath: ', resourcePath);
        // log.debug('!/node_modules/i.test(resourcePath): ', !/node_modules/i.test(resourcePath));
        // log.debug('/components?|pages?/i.test(resourcePath): ', /components?|pages?/i.test(resourcePath));
        return /components?|pages?/i.test(resourcePath);
    }

    private recursiveIssuer(m, c) {
        const issuer = c.moduleGraph.getIssuer(m);
        // For webpack@4 chunks = m.issuer

        if (issuer) {
            return this.recursiveIssuer(issuer, c);
        }

        const chunks = c.chunkGraph.getModuleChunks(m);
        // For webpack@4 chunks = m._chunks

        for (const chunk of chunks) {
            return chunk.name;
        }

        return false;
    }

    private getEntryPageModuleStyle(entry) {
        const map = {};
        Object.keys(entry).forEach(name => {
            // const styleName = [name, "Styles"].join("");
            map[name] = {
                name: name,
                test: (m, c, entry = name) => {
                    return m.constructor.name === 'CssModule' && this.recursiveIssuer(m, c) === entry;
                },
                chunks: 'all',
                enforce: true,
            };
        });
        return map;
    }

    private async pack(entry) {
        // log.info("IsomorphicPack.pack.run", entry);
        let localIdentName = prodLocalIdentName;
        let sourceMap = false;
        if (this.watchModel) {
            localIdentName = devLocalIdentName;
            sourceMap = true;
        }
        const tslintPath = Path.resolve(`${this.rootPath}tslint.json`);
        const tsConfigPath = Path.resolve(`${this.rootPath}tsconfig.json`);
        const rules = [];
        if (!this.tslintConfig.disable) {
            rules.push({
                test: /\.ts(x?)$/,
                enforce: "pre",
                loader: "tslint-loader",
                options: {
                    configFile: fs.existsSync(tslintPath) ? tslintPath : "",
                    tsConfigFile: fs.existsSync(tsConfigPath) ? tsConfigPath : "",
                    // 仅在调试时以error的形式提示错误信息，正式build时以warning的形式提示，主要考虑到兼容已有项目
                    emitErrors: this.watchModel === true,
                },
            });
        }
        const config: webpack.Configuration = {
            mode: this.watchModel ? "development" : "production",
            cache: true,
            // debug: true,
            devtool: "source-map",
            entry: entry,
            output: {
                chunkFilename: "[name]-chunk_[contenthash:8].js",
                publicPath: this.publicPath,
                filename: "[name]_[contenthash:8].js",
                path: Path.resolve(this.outputPath),
                assetModuleFilename: "assets/[name]_[contenthash][ext][query]",
            },
            externals: ({ context, request }, callback) => {
                const isExternal = /\/server\//i.test(request);
                if (isExternal || request === "node-mocks-http") {
                    callback(null, "''");
                } else {
                    callback();
                }
            },
            module: {
                rules: rules.concat([
                    {
                        test: /\.tsx?$/,
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
                    },
                    {
                        test: /\.css$/,
                        use: [
                            {
                                loader: MiniCssExtractPlugin.loader,
                                options: {
                                    modules: {
                                        namedExport: true,
                                    },
                                },
                            },
                            {
                                loader: "css-loader",
                                options: {
                                    importLoaders: 1,
                                    sourceMap,
                                    // modules: true,
                                    modules: {
                                        auto: this.shouldSourceModuled,
                                        localIdentName: localIdentName,
                                        namedExport: true,
                                    },
                                },
                            },
                            {
                                loader: "postcss-loader",
                                options: {
                                    postcssOptions: () => {
                                        return {
                                            plugins: [
                                                require("precss"),
                                                require("autoprefixer"),
                                            ],
                                        };
                                    },
                                },
                            },
                        ],
                        type: "javascript/auto",
                    },
                    {
                        test: /\.less$/,
                        use: [
                            {
                                loader: MiniCssExtractPlugin.loader,
                                options: {
                                    modules: {
                                        namedExport: true,
                                    },
                                },
                            },
                            {
                                loader: "css-loader",
                                options: {
                                    importLoaders: 2,
                                    sourceMap,
                                    esModule: true,
                                    modules: {
                                        auto: this.shouldSourceModuled,
                                        localIdentName: localIdentName,
                                        namedExport: true,
                                    },
                                },
                            },
                            {
                                loader: "postcss-loader",
                                options: {
                                    postcssOptions: () => {
                                        return {
                                            plugins: [
                                                require("precss"),
                                                require("autoprefixer"),
                                            ],
                                        };
                                    },
                                },
                            },
                            {
                                loader: "less-loader",
                                options: {
                                    sourceMap,
                                },
                            },
                        ],
                        type: "javascript/auto",
                    },
                    {
                        test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|swf)(\?.*)?$/,
                        type: "asset",
                    },
                ]),
            },
            name: "IsomorphicPack",
            plugins: [
                // new webpack.ProvidePlugin({
                //     Promise: "bluebird",
                // }),
                new MiniCssExtractPlugin({
                    filename: "[name]_[contenthash:8].css",
                    // chunkFilename: "[name]-chunk-[id]_[contenthash:8].css",
                }),
                new CopyWebpackPlugin({
                    patterns: [
                        {
                            context: "src",
                            from: "public/**/*",
                            // to: ({ context, absoluteFilename }) => {
                            //     const rel = Path.relative(context, absoluteFilename);
                            //     const relPath = rel.slice(0, rel.lastIndexOf("/"));
                            //     return `${relPath}/[name].[ext]`;
                            // },
                        },
                        // {
                        //     context: "./src",
                        //     from: "public/**/*.js",
                        //     to: ({ context, absoluteFilename }) => {
                        //         const rel = Path.relative(context, absoluteFilename);
                        //         const relPath = rel.slice(0, rel.lastIndexOf("/"));
                        //         return `${relPath}/[name]_[contenthash:8].[ext]`;
                        //     },
                        //     // transform (content, absoluteFrom) {
                        //     //     const result = UglifyJS.minify(content.toString(), {
                        //     //         toplevel: true,
                        //     //     });
                        //     //     if (result.error) {
                        //     //         log.error(this.taskName, " copy js: ", absoluteFrom, " emit an error: ", result.error);
                        //     //         return content;
                        //     //     } else {
                        //     //         return Buffer.from(result.code);
                        //     //     }
                        //     // },
                        // },
                        // {
                        //     context: "./src",
                        //     from: "public/**/*.css",
                        //     to: ({ context, absoluteFilename }) => {
                        //         const rel = Path.relative(context, absoluteFilename);
                        //         const relPath = rel.slice(0, rel.lastIndexOf("/"));
                        //         return `${relPath}/[name]_[contenthash:8].[ext]`;
                        //     },
                        //     // transform (content, absoluteFrom) {
                        //     //     const result = new CleanCSS({
                        //     //         level: 1
                        //     //     }).minify(content.toString());
                        //     //     if (result.errors) {
                        //     //         log.error(this.taskName, " copy css: ", absoluteFrom, " emit an error: ", result.errors);
                        //     //         return content;
                        //     //     } else {
                        //     //         return Buffer.from(result.styles);
                        //     //     }
                        //     // },
                        // },
                        // {
                        //     context: "./src",
                        //     from: "public/**/favicon.ico",
                        //     to: ({ context, absoluteFilename }) => {
                        //         const rel = Path.relative(context, absoluteFilename);
                        //         const relPath = rel.slice(0, rel.lastIndexOf("/"));
                        //         return `${relPath}/favicon.ico`;
                        //     },
                        //     // transform (content, absoluteFrom) {
                        //     //     const result = new CleanCSS({
                        //     //         level: 1
                        //     //     }).minify(content.toString());
                        //     //     if (result.errors) {
                        //     //         log.error(this.taskName, " copy css: ", absoluteFrom, " emit an error: ", result.errors);
                        //     //         return content;
                        //     //     } else {
                        //     //         return Buffer.from(result.styles);
                        //     //     }
                        //     // },
                        // },
                        // {
                        //     context: "./src",
                        //     from: "public/**/*",
                        //     to: ({ context, absoluteFilename }) => {
                        //         const rel = Path.relative(context, absoluteFilename)
                        //         const relPath = rel.slice(0, rel.lastIndexOf("/"))
                        //         return `${relPath}/[name]_[contenthash:8].[ext]`;
                        //     },
                        //     globOptions: {
                        //         ignore: ["**/*.js", "**/*.css", "**/favicon.ico"],
                        //     },
                        // },
                    ],
                }),
                new WebpackManifestPlugin({
                    fileName: Path.resolve(this.globalConfig.rootOutput, "assetsConfigMainfest.json"),
                }),
            ],
            resolve: {
                extensions: [".ts", ".tsx", ".js", ".css", ".png", ".jpg", ".gif", ".less"],
                modules: [
                    Path.resolve("src"),
                    Path.resolve(`${this.rootPath}node_modules`),
                ],
                plugins: [new DirectoryNamedWebpackPlugin()],
            },
            optimization: {
                moduleIds: "deterministic",
                runtimeChunk: {
                    name: "runtime"
                },
                splitChunks: {
                    // chunks: "all",
                    cacheGroups: {
                        defaultVendors: {
                            test: /[\\/]node_modules[\\/]/,
                            name: "vendor",
                            priority: 0,
                            chunks: "all",
                        },
                        common: {
                            name: "common",
                            minChunks: 2,
                            priority: -10,
                            chunks: "all",
                            reuseExistingChunk: true
                        },
                        ...this.getEntryPageModuleStyle(entry),
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
            },
        };

        let NODE_ENV = JSON.stringify("development");
        // 不是监控模式就压缩代码
        if (this.watchModel === false) {
            config.devtool = undefined;
            NODE_ENV = JSON.stringify("production");
        }

        const defineOption = {
            "process.env.NODE_ENV": NODE_ENV,
        };
        config.plugins.push(new webpack.DefinePlugin(defineOption));

        // if (this.vendorModel) {
        //     const manifestPath =
        //         Path.resolve(this.globalConfig.clientOutput, "vendor-manifest.json");
        //     const manifest = fs.readJsonSync(manifestPath);
        //     const dllReferencePlugin = new webpack.DllReferencePlugin({
        //         context: this.globalConfig.clientOutput,
        //         manifest,
        //     });
        //     config.plugins.push(dllReferencePlugin);
        // }
        if (this.argv && this.argv.verbose) {
            log.info(this.taskName, "pack", { config: JSON.stringify(config) });
        }

        try {
            await this.compile(config);
        } catch (e) {
            log.error(this.taskName, " webpacking raised an error: ", e);
        }
    }
}
export default IsomorphicPack;
