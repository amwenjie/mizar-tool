import { ConfigHelper } from "./libs/ConfigHelper";

export interface IGlobalConfig {
    assetsMainfest: string;
    rootOutput: string;
    publicPath: string;
    staticOutput: string;
    clientOutput: string;
}

export default (): IGlobalConfig  => {
    const publicPath = ConfigHelper.getPublicPath();
    const rootOutput = `./build`;
    return {
        assetsMainfest: "assetsMainfest.json",
        rootOutput,
        publicPath,
        staticOutput: `${rootOutput}/${publicPath}`,
        clientOutput: `${rootOutput}/${publicPath}client`,
    };
};

export const devLocalIdentName: string = "[path][name]__[local]_[contenthash:8]";
export const prodLocalIdentName: string = "_[contenthash:8]";
