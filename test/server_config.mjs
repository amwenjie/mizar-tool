import DirectoryNamedWebpackPlugin from "directory-named-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import ESLintWebpackPlugin from "eslint-webpack-plugin";
import StylelintPlugin from "stylelint-webpack-plugin";
import webpack from "webpack";
import LoadablePlugin from "@loadable/webpack-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import TerserJSPlugin from "terser-webpack-plugin";
import path from "path";

export default {
    "mode": "development",
    "devtool": "source-map",
    "plugins": [
        {
            "key": "StylelintWebpackPlugin",
            "options": {
                "cache": true,
                "cacheLocation": "node_modules/.cache/stylelint-webpack-plugin/.stylelintcache",
                "extensions": ["css", "less", "scss", "sass"],
                "emitError": true,
                "emitWarning": true,
                "failOnError": true,
                "files": "./src"
            },
            "startTime": 1726468788105,
            "prevTimestamps": {}
        }, {
            "definitions": {
                "IS_SERVER_RUNTIME": "true",
                "IS_DEBUG_MODE": "true",
                "DEV_STATIC_HR_SERVE": "false",
                "DEV_PROXY_CONFIG": "[]"
            }
        }
    ],
    "module": {
        "rules": [{
            "exclude": {},
            "test": {},
            "use": [{
                "loader": "ts-loader"
            }]
        }, {
            "exclude": {},
            "test": {},
            "loader": "connect-param-inject-loader"
        }, {
            "test": {},
            "use": [{
                "loader": "css-loader",
                "options": {
                    "importLoaders": 1,
                    "sourceMap": true,
                    "modules": {
                        "localIdentName": "[path][name]__[local]_[contenthash:8]",
                        "namedExport": true,
                        "exportOnlyLocals": true
                    }
                }
            }, {
                "loader": "postcss-loader",
                "options": {
                    "postcssOptions": {
                        "plugins": ["postcss-preset-env"]
                    }
                }
            }],
            "type": "javascript/auto"
        }, {
            "test": {},
            "use": [{
                "loader": "css-loader",
                "options": {
                    "importLoaders": 2,
                    "sourceMap": true,
                    "modules": {
                        "localIdentName": "[path][name]__[local]_[contenthash:8]",
                        "namedExport": true,
                        "exportOnlyLocals": true
                    }
                }
            }, {
                "loader": "postcss-loader",
                "options": {
                    "postcssOptions": {
                        "plugins": ["postcss-preset-env"]
                    }
                }
            }, {
                "loader": "less-loader",
                "options": {
                    "sourceMap": true
                }
            }],
            "type": "javascript/auto"
        }, {
            "test": {},
            "use": [{
                "loader": "css-loader",
                "options": {
                    "importLoaders": 2,
                    "sourceMap": true,
                    "modules": {
                        "localIdentName": "[path][name]__[local]_[contenthash:8]",
                        "namedExport": true,
                        "exportOnlyLocals": true
                    }
                }
            }, {
                "loader": "postcss-loader",
                "options": {
                    "postcssOptions": {
                        "plugins": ["postcss-preset-env"]
                    }
                }
            }, {
                "loader": "sass-loader",
                "options": { "sourceMap": true }
            }],
            "type": "javascript/auto"
        }, {
            "test": {},
            "type": "asset",
            "generator": {
                "filename": "G:\\\\work\\\\test-project\\\\dist\\\\static\\\\client\\\\assets\\\\[name]_[contenthash][ext][query]"
            }
        }],
        "parser": {
            "javascript": {
                "commonjsMagicComments": true
            }
        }
    },
    "resolve": {
        "extensions": [".ts", ".tsx", ".js", ".jsx", ".css", ".png", ".jpg", ".gif", ".less", "sass", "scss", "..."],
        "modules": [
            "node_modules", "G:\\\\work\\\\test-project\\\\src"
        ]
    },
    "resolveLoader": {
        "modules": [
            "node_modules",
            "G:\\\\work\\\\mizar-tool\\\\dist\\\\tools\\\\libs\\\\loaders"]
    },
    "externals": [null],
    "output": {
        "filename": "[name].cjs",
        "library": {
            "type": "commonjs2"
        },
        "path": "G:\\\\work\\\\test-project\\\\dist"
    },
    "externalsPresets": {
        "node": true
    },
    "target": "node",
    "optimization": {
        "emitOnErrors": false
    },
    "entry": {
        "index": "G:\\\\work\\\\test-project\\\\src\\\\server\\\\index"
    },
    "name": "ServerPack"
}