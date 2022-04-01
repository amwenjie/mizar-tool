import webpack from "webpack";
import { type ModuleFederationPluginOptions } from "webpack/lib/container/ModuleFederationPlugin.js";
import FederationModuleIdPlugin from "webpack-federation-module-id-plugin";
import { sharePluginMapType } from "../interface.js";
import ConfigHelper from "../libs/ConfigHelper.js";
import FederationStatsPlugin from "../libs/plugins/federation-stats-plugin/index.js";
import { checkIsLegalIdentifier } from "../libs/Utils.js";

const pluginMap: sharePluginMapType = {
    remoteMfPlugin: [],
    exposeMfPlugin: [],
    styleLintPlugin: [],
};

const identifierIllegalErrMsg = "the value of 'federation[\"name\"]' should be a legal js identifier in ./config/configure.json.";
const mfNameEmptypErrMsg = "the value of 'federation[\"name\"]' can't be empty when specified 'federation.exposes' field in ./config/configure.json.";

const moduleFederationConfig: ModuleFederationPluginOptions = ConfigHelper.get("federation", false);
if (moduleFederationConfig && moduleFederationConfig.remotes) {
    const mfName = moduleFederationConfig.name;
    if (mfName && !checkIsLegalIdentifier(mfName)) {
        throw new Error(identifierIllegalErrMsg);
    }
    pluginMap.remoteMfPlugin.push(
        new webpack.container.ModuleFederationPlugin({
            name: mfName,
            remotes: moduleFederationConfig.remotes,
        })
    );
}

if (moduleFederationConfig && moduleFederationConfig.exposes) {
    const mfName = moduleFederationConfig.name;
    if (!mfName) {
        throw new Error(mfNameEmptypErrMsg);
    }
    if (!checkIsLegalIdentifier(mfName)) {
        throw new Error(identifierIllegalErrMsg);
    }
    pluginMap.exposeMfPlugin.push(
        new FederationStatsPlugin(),
        new FederationModuleIdPlugin(),
        new webpack.container.ModuleFederationPlugin(
            Object.assign(
                {
                    filename: "remoteEntry.js",
                    name: mfName,
                },
                moduleFederationConfig,
            )
        ),
    );
}

export default pluginMap;