import fs from "fs-extra";
import ESLintWebpackPlugin from "eslint-webpack-plugin";
import path from "path";
import StylelintPlugin from "stylelint-webpack-plugin";
import { type Configuration } from "webpack";
import {
    type webpackPluginsType,
    type webpackRulesType,
 } from "../interface.js";
import ConfigHelper from "../libs/ConfigHelper.js";

function getEnvDef(isDebugMode: boolean): "development" | "production" {
    return isDebugMode ? "development" : "production";
}

function getPlugins(isDebugMode: boolean): webpackPluginsType {
    const plugins: webpackPluginsType = [];

    const stylelintConfig = ConfigHelper.get("stylelint", {
        extensions: ["css", "less", "scss", "sass"],
        files: "./src",
    });
    if (stylelintConfig) {
        plugins.push(new StylelintPlugin(stylelintConfig));
    }
    const esLintPluginConfig = ConfigHelper.get("eslint", {
        files: "./src",
        failOnError: !isDebugMode,
    });
    if (esLintPluginConfig) {
        plugins.push(new ESLintWebpackPlugin(esLintPluginConfig));
    }
    return plugins;
}

function getRules(): webpackRulesType {
    const rules: webpackRulesType = [];

    const tslintConfig = ConfigHelper.get("tslint", true);
    if (tslintConfig) {
        const tslintPath = path.resolve("./tslint.json");
        const tsConfigPath = path.resolve("./tsconfig.json");
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
                options: Object.assign(
                    {
                        compilerOptions: {
                            declaration: false,
                        },
                    },
                    ConfigHelper.get("ts-loader", {}),
                ),
            },
        ],
    });
    return rules;
}

export default function base(isDebugMode: boolean): Configuration {
    return {
        mode: getEnvDef(isDebugMode),
        devtool: isDebugMode ? "source-map" : undefined,
        plugins: getPlugins(isDebugMode),
        module: {
            rules: getRules(),
        },
        resolve: {
            extensions: [".ts", ".tsx", ".js", ".jsx", ".css", ".png", ".jpg", ".gif", ".less", "sass", "scss", "..."],
            modules: [
                "node_modules",
                path.resolve("./src"),
            ],
        },
        resolveLoader: {
            modules: [
                "node_modules",
            ],
        },
    };
}