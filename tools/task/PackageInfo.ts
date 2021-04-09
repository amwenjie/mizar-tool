/*
 * @Author: wenjie02
 * @Date: 2021-01-11 14:48:02
 * @LastEditTime: 2021-01-22 20:57:31
 * @LastEditors: wenjie02
 * @Description: 
 * @FilePath: /mizar-ssrframe-tool/tools/task/PackageInfo.ts
 * @Copyright 2021
 */
import * as fs from "fs-extra";
import * as Path from "path";
import { ConfigHelper } from "../libs/ConfigHelper";
import { ObjectUtil } from "../libs/ObjectUtil";
import { HelperTask } from "./HelperTask";
import Logger from "../libs/Logger";

const console = Logger();

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
        console.log("->", "PackageInfo", HelperTask.taking());
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
        console.info("PackageInfo.setVersion.version", this.packageJson.version);
    }
    private mkdir() {
        try {
            fs.mkdirpSync(this.buildPath);
        } catch (error) {
            console.error("PackageInfo.mkdir.CAN_NOT_MKDIR", this.buildPath);
        }
    }
}
export default PackageInfo;
