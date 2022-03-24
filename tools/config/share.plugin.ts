import webpack from "webpack";
import FederationModuleIdPlugin from "webpack-federation-module-id-plugin";
import { sharePluginMapType } from "../interface.js";
import FederationStatsPlugin from "../libs/plugins/federation-stats-plugin/index.js";
import ConfigHelper from "../libs/ConfigHelper.js";
import { checkIsLegalIdentifier } from "../libs/Utils.js";

const pluginMap: sharePluginMapType = {
    remoteMfPlugin: [],
    exposeMfPlugin: [],
    styleLintPlugin: [],
};

const moduleFederationConfig = ConfigHelper.get("federation", false);
const mfName = moduleFederationConfig.name || ConfigHelper.getPackageName();
if (moduleFederationConfig && moduleFederationConfig.remotes) {
    if (!checkIsLegalIdentifier(moduleFederationConfig.name)) {
        throw new Error("federation config field: 'federation[\"name\"]' is a illegal js identifier in ./config/configure.json.");
    }
    pluginMap.remoteMfPlugin.push(
        new webpack.container.ModuleFederationPlugin({
            name: mfName,
            remotes: moduleFederationConfig.remotes,
        })
    );
}

if (moduleFederationConfig && moduleFederationConfig.exposes) {
    if (!checkIsLegalIdentifier(moduleFederationConfig.name)) {
        throw new Error("federation config field: 'federation[\"name\"]' is a illegal js identifier in ./config/configure.json.");
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