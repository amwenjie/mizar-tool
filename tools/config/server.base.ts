import { 
    type Configuration,
} from "webpack";
import { merge } from "webpack-merge";
import nodeExternals from "webpack-node-externals";
import base from "./base.js";

export default function serverBase(isDebugMode: boolean): Configuration {
    return merge(base(isDebugMode), {
        externals: [
            nodeExternals({
                allowlist: [
                    /^mizar/,
                ],
            }),
        ],
        output: {
            filename: "[name].js",
            library: {
                type: "commonjs2",
            },
        },
        externalsPresets: {
            node: true,
        },
        target: "node",
        optimization: {
            emitOnErrors: false
        },
    });
}