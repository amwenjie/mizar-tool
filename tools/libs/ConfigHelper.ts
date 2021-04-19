import * as fs from "fs-extra";
import * as JSONCParser from "jsonc-parser";
import * as Path from "path";
import * as yargs from "yargs";
import { hideBin } from "yargs/helpers";
import Logger from "../libs/Logger";

const argv:any = yargs(hideBin(process.argv)).argv;

let logCtg;
if (argv.verbose) {
    logCtg = "all";
} else if (argv.debug) {
    logCtg = "debug";
}
const log = Logger(logCtg);

const configName = "package.json";
const cuzConf = "customConfig";

export interface ICustomConfig {
    port: number;
    assetsPathPrefix?: string;
    cdn?: string;
    tslint?: {
        disable: boolean;
    };
    vendorPack?: {
        minify: boolean;
        browserVendor: any[]
    };
    clientPack?: {
        minify?: boolean;
        cssModule?: boolean;
        chunk?: boolean;
        style?: {
            sourceMap?: boolean;
            base64?: boolean;
            ieCompat?: boolean;
        }
    };
    serverPack: {
        minify?: boolean;
        templateMinify?: boolean;
        debugPort: number;
    };
}

export class ConfigHelper {
    private static privateGet(node: string, defaultValue = null) {
        let result = defaultValue;
        const key = `${configName}->${node}`;
        log.info("ConfigHelper privateGet key: ", key);
        if (ConfigHelper.store[`${configName}-${node}`]) {
            log.info("read in store", key + "->" + JSON.stringify(ConfigHelper.store[`${configName}-${node}`]));
            return ConfigHelper.store[`${configName}-${node}`];
        }
        const configPath = Path.resolve(`./build/${configName}`);
        log.info("confighelper privateGet configPath: ", configPath);
        try {
            const content = fs.readFileSync(configPath, "utf8");
            let store = JSONCParser.parse(content);
            const info = node.split(".");
            log.info("ConfigHelper.get.info", info);
            for (let item of info) {
                log.info("item", item);
                log.info("store !== null", store !== null);
                log.info("store[item]", store[item]);
                if (store !== null && typeof store[item] !== "undefined") {
                    store = store[item];
                } else {
                    store = null;
                    break;
                }
            }
            if (store !== null) {
                log.info("ConfigHelper.get.store", store);
                result = store;
            } else {
                log.info("ConfigHelper.get.store get empty value");
            }
        } catch (error) {
            log.info("ConfigHelper.get raise an error: ", key + " -> " + error.message);
        }
        if (result === null) {
            const msg = `ConfigHelper > 未能获取到缺省和默认配置,${configName},${node}。`;
            throw new Error(msg);
        }
        log.info("ConfigHelper.get", key + "->" + JSON.stringify(result));
        ConfigHelper.store[`${configName}-${node}`] = result;
        return result;
    }
    public static store: any = {};

    public static set(node, value) {
        ConfigHelper.store[`${configName}-${node}`] = value;
    }
    public static get(node: string, defaultValue = null) {
        return ConfigHelper.privateGet(`${cuzConf}.${node}`, defaultValue);
    }
    public static getPackageVersion() {
        let patchVer = 0;
        // log.log(argv);
        if (argv.patchVer && argv.patchVer !== true) {
            patchVer = argv.patchVer;
        }
        const packageJSON = fs.readJSONSync("package.json");
        const version = packageJSON.version.split(".");
        version[2] = patchVer;
        return version.slice(0, 3).join(".");
    }
    public static getPackageName() {
        return ConfigHelper.privateGet("name");
    }
    public static getAssetsPathPrefix() {
        return ConfigHelper.get("assetsPathPrefix", "");
    }
    public static getCDN() {
        return ConfigHelper.get("cdn", "");
    }
    public static getPublicPath() {
        const assetPath = ConfigHelper.getAssetsPathPrefix();
        if (assetPath) {
            return `${ConfigHelper.getAssetsPathPrefix()}/${ConfigHelper.getPackageName()}/`;
        } else {
            return `${ConfigHelper.getPackageName()}/`;
        }
    }
}
export default ConfigHelper;
