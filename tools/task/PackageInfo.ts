import * as fs from "fs-extra";
import * as Path from "path";
import { ConfigHelper } from "../libs/ConfigHelper";
import { ObjectUtil } from "../libs/ObjectUtil";
import { HelperTask } from "./HelperTask";
import Logger from "../libs/Logger";

import * as yargs  from "yargs";
import { hideBin } from "yargs/helpers";
const argv:any = yargs(hideBin(process.argv)).argv;

let logCtg;
if (argv.verbose) {
    logCtg = "all";
} else if (argv.debug) {
    logCtg = "debug";
}
const log = Logger(logCtg);

export class PackageInfo {
    private rootPath: string = Path.resolve("./");
    private packageJson;
    private buildPath: string = Path.resolve("./build");
    public watchModel: boolean = false;

    public setWatchModel(watchModel: boolean = true) {
        this.watchModel = watchModel;
        return this;
    }

    public async run() {
        log.info("->", "PackageInfo", HelperTask.taking());
        this.mkdir();
        this.packageJson = this.replacePackage();
        this.setVersion();
        this.outputPackageJson();
        return this;
    }
    public replacePackage() {
        let packageJson: any = fs.readFileSync(this.rootPath + "/package.json", "utf8");
        packageJson = JSON.parse(packageJson);
        packageJson.scripts = undefined;
        packageJson.scriptOperation = undefined;
        packageJson.devDependencies = undefined;
        const cuzConf = packageJson.customConfig || {};
        const customConfig: {
            port: number;
            assetsPathPrefix?: string;
            cdn?: string;
            debugPort?: number;
        } = {
            port: cuzConf.port,
            assetsPathPrefix: cuzConf.assetsPathPrefix,
            cdn: cuzConf.cdn,
        };
        if (this.watchModel) {
            customConfig.debugPort = cuzConf.debugPort
        }
        packageJson = ObjectUtil.sort(packageJson);
        return packageJson;
    }
    public outputPackageJson() {
        fs.writeJsonSync(this.buildPath + "/package.json", this.packageJson, { spaces: "  " });
    }
    public setVersion() {
        const version = ConfigHelper.getPackageVersion();
        this.packageJson.version = version;
        log.info("PackageInfo.setVersion.version", this.packageJson.version);
    }
    private mkdir() {
        try {
            fs.mkdirpSync(this.buildPath);
        } catch (error) {
            log.error("PackageInfo.mkdir.CAN_NOT_MKDIR", this.buildPath);
        }
    }
}
export default PackageInfo;
