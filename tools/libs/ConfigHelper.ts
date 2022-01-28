import fs from "fs-extra";
import Path from "path";
import { Options } from "stylelint-webpack-plugin";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import Logger from "../libs/Logger";

const argv:any = yargs(hideBin(process.argv)).argv  as any;
const log = Logger("ConfigHelper");
const configureJSON = Path.resolve("./config/configure.json");
const appConfJSON = Path.resolve("./config/app.json");

export interface IAppConf {
    name: string;
    port: number;
    assetsPathPrefix?: string;
    cdn?: string;
}

export interface IConfigure {
    debugPort?: number;
    logger?: string;
    tslint?: {
        disable: boolean;
    };
    stylelint?: boolean | Options | string;
}

export class ConfigHelper {
    public static store: any = {};

    private static privateGet(node: string, defaultValue = null, configPath = configureJSON): any {
        let result = defaultValue;
        const key = `${configPath}->${node}`;
        log.info("ConfigHelper privateGet key: ", key);
        if (ConfigHelper.store[`${configPath}-${node}`]) {
            log.info("read in store", key + "->" + JSON.stringify(ConfigHelper.store[`${configPath}-${node}`]));
            return ConfigHelper.store[`${configPath}-${node}`];
        }
        log.info("confighelper privateGet configPath: ", configPath);
        try {
            let store = fs.readJSONSync(configPath);
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
            const msg = `ConfigHelper > 未能获取到缺省和默认配置,${configPath},${node}。`;
            throw new Error(msg);
        }
        log.info("ConfigHelper.get", key + "->" + JSON.stringify(result));
        ConfigHelper.store[`${configPath}-${node}`] = result;
        return result;
    }

    public static set(node: string, value, configPath = configureJSON): void {
        ConfigHelper.store[`${configPath}-${node}`] = value;
    }

    public static get(node: string, defaultValue = null, configPath = configureJSON): any {
        return ConfigHelper.privateGet(node, defaultValue, configPath);
    }

    public static getPackageVersion(): string {
        let patchVer = 0;
        // log.info(argv);
        if (argv.patchVer && argv.patchVer !== true) {
            patchVer = argv.patchVer;
        }
        const packageJSON = fs.readJSONSync("package.json");
        const version = packageJSON.version.split(".");
        version[2] = patchVer;
        return version.slice(0, 3).join(".");
    }

    public static getPackageName(): any {
        return ConfigHelper.get("name", null, appConfJSON);
    }

    public static getAssetsPathPrefix(): string {
        let prefix = ConfigHelper.get("assetsPathPrefix", "", appConfJSON);
        if (prefix && !prefix.endsWith("/")) {
            prefix += "/";
        }
        return prefix;
    }

    public static getCDN(): string {
        return ConfigHelper.get("cdn", "", appConfJSON);
    }

    public static getPublicPath(): string {
        return `${ConfigHelper.getAssetsPathPrefix()}`; // ${ConfigHelper.getPackageName()}/`;
    }
}

export default ConfigHelper;
