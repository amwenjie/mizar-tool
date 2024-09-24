import type { Options as eslintOptions } from "eslint-webpack-plugin";
import fs from "fs-extra";
import path from "node:path";
import type { Options as stylelintOptions } from "stylelint-webpack-plugin";
import Logger from "../libs/Logger.js";

const log = Logger("ConfigHelper");
const configureJSON = path.resolve("./config/configure.json");
const appConfJSON = path.resolve("./config/app.json");

export interface IAppConf {
    name: string;
    port: number;
    assetsPathPrefix?: string;
    cdn?: string;
    [conf: string]: unknown;
}

export interface IConfigure {
    debugPort?: number;
    logger?: string;
    eslint?: false | eslintOptions;
    stylelint?: false | stylelintOptions;
    [conf: string]: unknown;
}

export default class ConfigHelper {
    public static store: {
        [key: string]: boolean | string | number | RegExp | object | null | undefined;
    } = {};

    private static privateGet(node: string, defaultValue = null, configPath = configureJSON): unknown {
        let result = defaultValue;
        const key = `${configPath}->${node}`;
        log.info("ConfigHelper privateGet key: ", key);
        if (ConfigHelper.store[`${configPath}-${node}`]) {
            log.info("read in store", key + "->" + JSON.stringify(ConfigHelper.store[`${configPath}-${node}`]));
            return ConfigHelper.store[`${configPath}-${node}`];
        }
        try {
            let store = fs.readJSONSync(configPath);
            const info = node.split(".");
            log.info("ConfigHelper.get.info", info);
            for (const item of info) {
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

    public static get(node: string, defaultValue = null, configPath = configureJSON): unknown {
        return ConfigHelper.privateGet(node, defaultValue, configPath);
    }

    public static getPackageName(): string | null {
        return ConfigHelper.get("name", null, appConfJSON) as (string | null);
    }

    public static getAssetsPathPrefix(): string {
        let prefix = ConfigHelper.get("assetsPathPrefix", "", appConfJSON) as string;
        if (prefix && !prefix.endsWith("/")) {
            prefix += "/";
        }
        return prefix;
    }

    public static getCDN(): string {
        return ConfigHelper.get("cdn", "", appConfJSON) as string;
    }

    public static getPublicPath(): string {
        return `${ConfigHelper.getAssetsPathPrefix()}`; // ${ConfigHelper.getPackageName()}/`;
    }
}
