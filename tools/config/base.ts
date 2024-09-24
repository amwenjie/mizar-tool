import ESLintWebpackPlugin from "eslint-webpack-plugin";
import path from "node:path";
import StylelintPlugin from "stylelint-webpack-plugin";
import { fileURLToPath } from "node:url";
import type { Configuration } from "webpack";
import type {
    webpackPluginsType, webpackRulesType,
} from "../interface.js";
import ConfigHelper from "../libs/ConfigHelper.js";

// const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getEnvDef(isDebugMode: boolean): "development" | "production" {
    return isDebugMode ? "development" : "production";
}

function getPlugins(isDebugMode: boolean): webpackPluginsType[] {
    const plugins: webpackPluginsType[] = [];

    const defaultStylelintConf = {
        extensions: ["css", "less", "scss", "sass"],
        files: "./src",
    };
    let stylelintConf = ConfigHelper.get("stylelint", true);
    if (stylelintConf === true) {
        stylelintConf = defaultStylelintConf;
    }
    if (stylelintConf) {
        plugins.push(new StylelintPlugin(stylelintConf));
    }

    const defaultESLintConf = {
        files: "./src",
        extensions: ["ts", "tsx", "js", "jsx", "mjs", "cjs"],
        failOnError: !isDebugMode,
        configType: "flat",
    };
    let esLintPluginConf = ConfigHelper.get("eslint", true);
    if (esLintPluginConf === true) {
        esLintPluginConf = defaultESLintConf;
    }
    if (esLintPluginConf) {
        plugins.push(new ESLintWebpackPlugin(esLintPluginConf));
    }
    return plugins;
}

function getRules(): webpackRulesType[] {
    const rules: webpackRulesType[] = [];

    rules.push({
        exclude: /[\\/]node_modules[\\/]|\.d\.ts$/i,
        test: /\.tsx?$/i,
        use: [
            {
                loader: "ts-loader",
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
            // Add support for TypeScripts fully qualified ESM imports.
            extensionAlias: {
                ".js": [".js", ".ts"],
                ".cjs": [".cjs", ".cts"],
                ".mjs": [".mjs", ".mts"],
            },
            modules: [
                "node_modules",
                path.resolve("./src"),
            ],
        },
        resolveLoader: {
            modules: [
                "node_modules",
                path.resolve(import.meta.dirname, "../libs/loaders"),
            ],
        },
    };
}