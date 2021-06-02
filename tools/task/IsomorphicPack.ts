import { green, red, yellow } from "colorette";
import * as CopyWebpackPlugin from "copy-webpack-plugin";
import * as CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import * as DirectoryNamedWebpackPlugin from "directory-named-webpack-plugin";
// import * as StylelintPlugin from "stylelint-webpack-plugin";
import * as MiniCssExtractPlugin from "mini-css-extract-plugin";
import * as TerserJSPlugin from "terser-webpack-plugin";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import { WebpackManifestPlugin } from "webpack-manifest-plugin";
import * as fs from "fs-extra";
import * as klaw from "klaw";
import * as Path from "path";
import * as webpack from "webpack";
import getGlobalConfig, { IGlobalConfig, devLocalIdentName, prodLocalIdentName } from "../getGlobalConfig";
import { ConfigHelper } from "../libs/ConfigHelper";
import Logger from "../libs/Logger";
import { WebpackTaskBase } from "../libs/WebpackTaskBase";
import { HelperTask } from "./HelperTask";
import { boolean } from "yargs";

const StylelintPlugin = require('stylelint-webpack-plugin');
const log = Logger("IsomorphicPack");
export class IsomorphicPack extends WebpackTaskBase {
    private clientEntrySrc = "src/isomorphic/clientEntries";
    private pageSrc = "src/isomorphic/pages";
    private styleSrc = "src/isomorphic/styleEntries";
    private vendorModel: boolean = false;
    private analyzMode = false;
    private eslintConfig = null;
    private stylelintConfig = null;
    private tslintConfig = null;
    private globalConfig: IGlobalConfig;
    private publicPath = "";
    private outputPath = "";
    constructor() {
        super("IsomorphicPack");
        this.setTaskName("IsomorphicPack");
    }

    private getPublicPath() {
        const path = [
            this.watchModel ? "/" : ConfigHelper.getCDN(),
            this.globalConfig.publicPath,
            'client/'
        ].join("");
        log.debug("isomorphicPack getPublicPath: ", path);
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
    public setAnalyzMode(analyzMode) {
        this.analyzMode = analyzMode;
        return this;
    }
    public async run() {
        this.globalConfig = getGlobalConfig();
        this.tslintConfig = ConfigHelper.get("tslint", { disable: false });
        this.stylelintConfig = this.getStylelintConfig();
        log.debug("stylelintConfig: ", this.stylelintConfig);
        this.publicPath = this.getPublicPath();
        this.outputPath = `${this.rootPath}${this.globalConfig.clientOutput}`;

        log.info("->", "IsomorphicPack", HelperTask.taking());
        try {
            const entry = await this.scan();
            if (!entry || Object.keys(entry).length === 0) {
                log.warn(yellow(`${this.taskName}, scan emtpy entry`));
                return;
            }
            log.debug(this.taskName, "run.entry", entry);
            await this.pack(entry);
        } catch (error) {
            log.error(this.taskName, "FATAL_ERROR", error.message);
            throw error;
        }
    }

    private getStylelintConfig() {
        const stylelintPath = Path.resolve(`${this.rootPath}.stylelintrc.json`);
        const defaultConfig = {
            configFile: fs.existsSync(stylelintPath) ? stylelintPath : undefined,
            files: "**/*.(le|s(a|c)|c)ss",
        };
        const config = ConfigHelper.get("stylelint");
        if (typeof config === "boolean") {
            if (config === false) {
                return false;
            }
        } else if (typeof config === "object") {
            return config;
        } else if (typeof config === "string") {
            if (fs.existsSync(config)) {
                const fn = require(config).default;
                if (typeof fn === "function") {
                    try {
                        return fn();
                    } catch (e) {
                        log.error("exec stylelint config error: ", config);
                        return defaultConfig;
                    }
                }
            }
        }
        return defaultConfig;
    }

    private async styleScan() {
        return new Promise((resolve, reject) => {
            const entries = {};
            const entryDir = this.rootPath + this.styleSrc;
            if (!fs.existsSync(entryDir)) {
                log.warn(yellow(`isomorphic pack styleEntry 入口目录不存在：, ${entryDir}`));
                resolve({});
                return;
            }
            const walk = klaw(entryDir, {
                depthLimit: 0,
            });
            walk.on("data", (state) => {
                const src = state.path;
                const isFile = state.stats.isFile();
                if (isFile && /\.css$|\.s[ac]ss$|\.less$/i.test(src)) {
                    const fileObj = Path.parse(src);
                    // const dirName = src.replace(Path.resolve(this.rootPath), "")
                    //     .replace(".css", "")
                    //     .replace(".less", "")
                    //     .replace(".sass", "")
                    //     .replace(".scss", "")
                    //     .replace(/\\/g, "/")
                    //     .replace("/" + this.styleSrc + "/", "");
                    entries["styleEntry/" + fileObj.name] = [src];
                }
            });
            walk.on("end", () => {
                log.debug("IsomorphicPack.styleScan.end", Path.resolve(this.rootPath));
                log.debug("IsomorphicPack.styleScan.entries", entries);
                resolve(entries);
            });
            walk.on("error", (error) => {
                reject(error);
            });
        });
    }

    private async pageScan() {
        return new Promise((resolve, reject) => {
            const react16Depends = ["core-js/features/map", "core-js/features/set"];
            const entries = {};
            const entryDir = this.rootPath + this.pageSrc;
            if (!fs.existsSync(entryDir)) {
                log.warn(yellow(`isomorphic pack build 入口目录不存在：, ${entryDir}`));
                resolve({});
                return;
            }
            const walk = klaw(entryDir, {
                depthLimit: 0,
            });
            walk.on("data", async (state) => {
                const src = state.path;
                const isDir = state.stats.isDirectory();
                if (isDir) {
                    const dirArr = src.split(Path.sep);
                    const dirName = dirArr[dirArr.length - 1];
                    if (/^[A-Z].+/.test(dirName)) {
                        const sm = [
                            // ...react16Depends,
                            src + "/index.tsx",
                        ];
                        const lessFile = src + "/index.less";
                        try {
                            if (fs.existsSync(lessFile)) {
                                sm.push(lessFile);
                            }
                        } catch (e) {
                            console.warn(e);
                        }
                        entries["page/" + dirName] = sm;
                    }
                }
            });
            walk.on("end", () => {
                log.debug("IsomorphicPack.pageScan.end", Path.resolve(this.rootPath));
                log.debug("IsomorphicPack.pageScan.entries", entries);
                resolve(entries);
            });
            walk.on("error", (error) => {
                reject(error);
            });
        });
    }

    private clientEntryScan() {
        return new Promise((resolve, reject) => {
            const react16Depends = ["core-js/features/map", "core-js/features/set", "raf/polyfill"];
            const entries: any = {};
            const entryDir = this.rootPath + this.clientEntrySrc;
            if (!fs.existsSync(entryDir)) {
                log.warn(yellow(`isomorphic pack build 入口目录不存在：, ${entryDir}`));
                resolve({});
                return;
            }
            const walk = klaw(entryDir, {
                depthLimit: 0,
            });
            walk.on("data", (state) => {
                const src = state.path;
                const isFile = state.stats.isFile();
                if (isFile && /\.ts$|\.tsx$|\.js$/i.test(src)) {
                    const fileObj = Path.parse(src);
                    // const dirName = src.replace(Path.resolve(this.rootPath), "")
                    //     .replace(".tsx", "")
                    //     .replace(".ts", "")
                    //     .replace(/\\/g, "/")
                    //     .replace("/" + this.src + "/", "");
                    entries[fileObj.name] = [...react16Depends, src];
                }
            });
            walk.on("end", () => {
                log.debug("IsomorphicPack.clientEntryScan.end", Path.resolve(this.rootPath));
                log.debug("IsomorphicPack.clientEntryScan.entries", entries);
                resolve(entries);
            });
            walk.on("error", (error) => {
                reject(error);
            });
        });
    }

    /**
     * 入口文件搜寻
     */
    private async scan() {
        return new Promise(async (resolve, reject) => {
            Promise.all([this.styleScan(), this.clientEntryScan()])
            .then(entries => {
                const combinedEntries = Object.assign({}, entries[0], entries[1]);
                log.debug("IsomorphicPack.pack.keys", Object.keys(combinedEntries).join(","));
                resolve(combinedEntries);
            }).catch(e => {
                reject(e);
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
        // .filter(name => !/^styleEntry\//.test(name))
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

    private getCssAssetsMainfest() {
        const cssMainfestPath = Path.resolve(this.outputPath, this.globalConfig.assetsMainfest);
        const cssMainfestJson = require(cssMainfestPath);
        const seedJson: any = {};
        Object.getOwnPropertyNames(cssMainfestJson).forEach(key => {
            seedJson[`styleEntries/${key}`] = this.publicPath + cssMainfestJson[key];
        });
        log.debug("seedJson: ", seedJson);
        fs.unlink(cssMainfestPath, (err) => {});
        return seedJson;
    }

    private async pack(entry) {
        // log.info("IsomorphicPack.pack.run", entry);
        const mode = this.watchModel ? "development" : "production";
        // const mode = this.watchModel ? JSON.stringify("development") : JSON.stringify("production");
            
        const config: webpack.Configuration = {
            mode,
            // cache: true,
            // debug: true,
            devtool: this.watchModel ? "source-map" : undefined,
            entry: entry,
            output: {
                chunkFilename: "[name]-chunk_[contenthash:8].js",
                publicPath: this.publicPath,
                filename: "[name]_[contenthash:8].js",
                path: Path.resolve(this.outputPath),
                assetModuleFilename: "assets/[name]_[contenthash:8][ext][query]",
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
                rules: this.getRules(),
            },
            name: "IsomorphicPack",
            plugins: this.getPlugins(),
            resolve: {
                extensions: [".ts", ".tsx", ".js", ".css", ".png", ".jpg", ".gif", ".less", "sass", "scss", "..."],
                modules: [
                    Path.resolve(__dirname, "src"),
                    "node_modules",
                ],
                plugins: [
                    new DirectoryNamedWebpackPlugin(),
                ],
            },
            optimization: this.getOptimization().optimization,
        };

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
        log.info(this.taskName, "pack", { config: JSON.stringify(config) });

        try {
            await this.compile(config);
        } catch (e) {
            log.error(this.taskName, " webpacking raised an error: ", e);
        }
    }

    private getOptimization(): webpack.Configuration {
        return {
            optimization: {
                minimize: !this.watchModel,
                moduleIds: "deterministic",
                runtimeChunk: {
                    name: "runtime"
                },
                splitChunks: {
                    chunks: "all",
                    cacheGroups: {
                        libBase: {
                            test: /[\\/](react(-(redux|dom|router|router-config|router-dom))?|redux(-thunk)?|react)[\\/]/,
                            name: "lib",
                            priority: 30,
                            chunks: "all",
                            // maxSize: 204800,
                        },
                        appVendor: {
                            test: /[\\/]node_modules[\\/]/,
                            name: "vendor",
                            priority: 20,
                            chunks: "all",
                            reuseExistingChunk: true,
                            // maxSize: 204800,
                        },
                        common: {
                            name: "common",
                            minChunks: 2,
                            chunks: "all",
                            reuseExistingChunk: true,
                            // minSize: 10000,
                            // maxSize: 100000,
                            // maxSize: 204800,
                        },
                        // ...this.getEntryPageModuleStyle(entry),
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
            }
        };
    }

    private getRules() {
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
        rules.push({
            test: /\.tsx?$/i,
            exclude: /\.d\.ts$/i,
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
            test: /\.css$/i,
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
        });
        rules.push({
            test: /\.less$/i,
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
        });
        rules.push({
            test: /\.s[ac]ss$/i,
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
                    loader: "sass-loader",
                    options: {
                        sourceMap,
                    },
                },
            ],
            type: "javascript/auto",
        });
        rules.push({
            test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|swf)(\?.*)?$/i,
            type: "asset",
        });
        return rules;
    }

    private getPlugins() {
        const defineOption = {
            // "process.env.NODE_ENV": JSON.stringify(mode),
            // "process.env.RUNTIME_ENV": JSON.stringify("client"),
            // "process.env.IS_SERVER_ENV": JSON.stringify(false),
            "process.env.IS_DEBUG_MODE": JSON.stringify(!!this.watchModel),
        };

        const plugins = [
            new webpack.DefinePlugin(defineOption),
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
                // seed: this.getCssAssetsMainfest(),
                fileName: Path.resolve(this.globalConfig.rootOutput, this.globalConfig.assetsMainfest),
            }),
        ];
        if (this.analyzMode) {
            plugins.push(new BundleAnalyzerPlugin({
                analyzerMode: this.watchModel ? "server" : "disabled",
                generateStatsFile: !this.watchModel,
                openAnalyzer: false,
            }));
        }
        if (this.stylelintConfig !== false) {
            plugins.push(new StylelintPlugin(this.stylelintConfig));
        }
        return plugins;
    }

    // protected async doneCallback() {
    //     console.log(green(`${this.taskName}, success`));
    //     await this.reorgStyleEntry();
    // }

    private async reorgStyleEntry() {
        const cssMainfestPath = Path.resolve(this.globalConfig.rootOutput, this.globalConfig.assetsMainfest);
        const cssMainfestJson = require(cssMainfestPath);
        console.log("cssMainfestJson: ", cssMainfestJson);
        const dltKeys = Object.keys(cssMainfestJson).filter(key => /^styleEntry\/.+\.js$/.test(key));
        dltKeys.forEach(k => {
            delete cssMainfestJson[k];
        });
        try {
            await fs.writeJson(cssMainfestPath, cssMainfestJson, {
                spaces: 2,
            });
            await this.reorgStyleEntryFile();
        } catch (err) {
            log.error("reorgStyleEntry error: ", err);
        }
    }

    private async reorgStyleEntryFile() {
        return new Promise((resolve, reject) => {
            const styleEntryDir = Path.resolve(this.outputPath, "styleEntry");
            if (fs.existsSync(styleEntryDir)) {
                const walk = klaw(styleEntryDir, {
                    filter: path => /\.ts$|\.tsx$|\.js$/i.test(path)
                });
                walk.on("data", (state) => {
                    fs.unlink(state.path, (err) => {});
                });
                walk.on("error", (err, file) => {
                    log.error("unlink file: ", file.path, " rais an error: ", err.message);
                    resolve("error");
                })
                walk.on("end", () => resolve("end"));
            }
            resolve("no-file");
        });
    }
}
export default IsomorphicPack;
