import ConfigHelper from "./ConfigHelper.js";

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

export const devLocalIdentName = "[path][name]__[local]_[contenthash:8]";
export const prodLocalIdentName = "_[contenthash:8]";
export const assetModuleFilename = "assets/[name]_[contenthash][ext][query]";
