import fs from "fs-extra";
import getGlobalConfig from "../../../getGlobalConfig";

const pluginName = "ClientEntryJsonPlugin";

export default class ClientEntryJsonPlugin {
    entryKeys: string[];
    constructor() {
    }
    apply(compiler) {
        compiler.hooks.entryOption.tap(pluginName, (context, entry) => {
            this.entryKeys = Object.keys(entry || {
                index: ""
            });
            fs.writeJSON(getGlobalConfig().rootOutput + "/clientEntry.json", this.entryKeys, { spaces: "  " });
        });
    }
}