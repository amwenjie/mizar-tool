import { cyan, red } from "colorette";
import fs from "fs-extra";
import klaw from "klaw";
import path from "path";
import type { Configuration, EntryObject, } from "webpack";
import getGlobalConfig, { type IGlobalConfig } from "../libs/getGlobalConfig.js";
import Logger from "../libs/Logger.js";
import { WebpackTaskBase } from "../libs/WebpackTaskBase.js";
import { HelperTask } from "./HelperTask.js";
const log = Logger("ServerApiPack");

export class ServerApiPack extends WebpackTaskBase {
    private globalConfig: IGlobalConfig;

    constructor(taskName = "ServerApiPack") {
        super(taskName);
        this.globalConfig = getGlobalConfig();
        this.src = path.resolve("./src/server/apis");
        this.dist = path.resolve(`${this.globalConfig.rootOutput}`);
    }

    private async scan(): Promise<EntryObject> {
        return new Promise((resolve, reject) => {
            const entry = {};
            if (!fs.existsSync(this.src)) {
                log.warn("ServerApiPack pack build 入口目录不存在：", this.src);
                resolve({});
                return;
            }
            const walk = klaw(this.src);
            walk.on("data", (state) => {
                const src = state.path;
                if (/\.ts?/.test(src)) {
                    const dirName = src.replace(this.src + path.sep, "")
                        .replace(".tsx", "")
                        .replace(".ts", "")
                        .replace(/\\/g, "/");
                    entry["apis/" + dirName] = src;
                }
            });
            walk.on("end", () => {
                log.info(cyan(this.getCmdName()), "scan done ; pack.keys", Object.keys(entry).join(","));
                resolve(entry);
            });
            walk.on("error", e => {
                log.error(red("scan entry cause an error: "), e);
                reject(e);
            });
        });
    }

    protected async compile(): Promise<void|Error> {
        log.info("->", cyan(this.getCmdName()), HelperTask.taking());
        
        const entry: EntryObject = await this.scan();
        if (!entry || Object.keys(entry).length === 0) {
            log.warn(cyan(this.getCmdName()), " scan emtpy entry");
            return;
        }
        log.info(cyan(this.getCmdName()), "run.entry", entry);

        const config: Configuration = {
            entry,
            name: this.taskName,
            output: {
                path: this.dist,
            },
        };
        log.info("ServerApiPack.pack", { config: JSON.stringify(config) });
        await super.compile(config);
    }
}

export default ServerApiPack;
