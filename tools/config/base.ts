import path from "path";
import { fileURLToPath } from 'url';
import { type Configuration } from "webpack";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getEnvDef(isDebugMode: boolean): "development" | "production" {
    return isDebugMode ? "development" : "production";
}

export default function base(isDebugMode: boolean): Configuration {
    return {
        mode: getEnvDef(isDebugMode),
        devtool: isDebugMode ? "source-map" : undefined,
        resolve: {
            extensions: [".ts", ".tsx", ".js", ".css", ".png", ".jpg", ".gif", ".less", "sass", "scss", "..."],
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