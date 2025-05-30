import ConfigHelper from "./ConfigHelper.js";
import { getLocalIdentNamePrefix } from "./Utils.js";

export interface IGlobalConfig {
    assetsMainfest: string;
    rootOutput: string;
    publicPath: string;
    staticOutput: string;
    clientOutput: string;
}

export default (): IGlobalConfig  => {
    const publicPath = ConfigHelper.getPublicPath();
    const rootOutput = "./dist";
    return {
        assetsMainfest: "assetsMainfest.json",
        rootOutput,
        publicPath,
        staticOutput: `${rootOutput}/${publicPath}`,
        clientOutput: `${rootOutput}/${publicPath}client`,
    };
};

const isPrefixProjectName = ConfigHelper.get("isPrefixProjectName", false);
let prefixProjectName = "";
let prefixProjectNameHash = "";

if (isPrefixProjectName) {
    [prefixProjectName, prefixProjectNameHash] = getLocalIdentNamePrefix(ConfigHelper.getPackageName());
    prefixProjectName += "_";
    prefixProjectNameHash += "_";
}
export const devLocalIdentName = `${prefixProjectName}[path][name]__[local]_[contenthash:8]`;
export const prodLocalIdentName = `${prefixProjectNameHash}[contenthash:8]`;
export const assetModuleFilename = `assets/[name]_[contenthash][ext][query]`;
