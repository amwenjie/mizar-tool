import path from "path";
import { type Configuration } from "webpack";

function getEnvDef(isDebugMode: boolean): "development"|"production" {
    return isDebugMode ? "development" : "production";
}

export default function base(isDebugMode: boolean): Configuration {
    return {
        mode: getEnvDef(isDebugMode),
        devtool: isDebugMode ? "source-map" : undefined,
        resolve: {
            extensions: [".ts", ".tsx", ".js", ".css", ".png", ".jpg", ".gif", ".less", "sass", "scss", "..."],
            modules: [
                path.resolve(__dirname, "src"),
                "node_modules",
            ],
        },
    };
}