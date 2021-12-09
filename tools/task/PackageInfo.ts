import fs from "fs-extra";
import Path from "path";
import { ConfigHelper } from "../libs/ConfigHelper";
import { ObjectUtil } from "../libs/ObjectUtil";
import { HelperTask } from "./HelperTask";
import Logger from "../libs/Logger";

const log = Logger("PackageInfo");

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
        packageJson = ObjectUtil.sort(packageJson);
        return packageJson;
    }
    public outputPackageJson() {
        fs.writeJsonSync(this.buildPath + "/package.json", this.packageJson, { spaces: "  " });
        if (fs.existsSync(this.rootPath + "/README.md")) {
            try {
                fs.copySync(this.rootPath + "/README.md", this.buildPath + "/README.md");
            } catch (e) {
                log.error(`copy ${this.rootPath + "/README.md"} raise an error`, e);
            }
        }
        // if (fs.existsSync(this.rootPath + "/package-lock.json")) {
        //     try {
        //         fs.copySync(this.rootPath + "/package-lock.json", this.buildPath + "/package-lock.json");
        //     } catch (e) {
        //         log.error("copy package-lock raise an error", e);
        //     }
        // }
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
