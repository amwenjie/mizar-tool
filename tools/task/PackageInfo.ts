import fs from "fs-extra";
import Path from "path";
import { ConfigHelper } from "../libs/ConfigHelper";
import Logger from "../libs/Logger";
import { ObjectUtil } from "../libs/ObjectUtil";
import TaskBase from "../libs/TaskBase";
import { HelperTask } from "./HelperTask";

const log = Logger("PackageInfo");

export class PackageInfo extends TaskBase {
    private packageJson;

    constructor(taskName = "PackageInfo") {
        super(taskName);
    }

    public async run(): Promise<void> {
        log.info("->", "PackageInfo", HelperTask.taking());
        this.mkdir();
        this.packageJson = this.replacePackage();
        this.setVersion();
        this.outputPackageJson();
    }

    public replacePackage(): any {
        let packageJson: any = fs.readFileSync(this.rootPath + "/package.json", "utf8");
        packageJson = JSON.parse(packageJson);
        packageJson = ObjectUtil.sort(packageJson);
        return packageJson;
    }

    public outputPackageJson(): PackageInfo {
        fs.writeJsonSync(this.dist + "/package.json", this.packageJson, { spaces: "  " });
        if (fs.existsSync(this.rootPath + "/README.md")) {
            try {
                fs.copySync(this.rootPath + "/README.md", this.dist + "/README.md");
            } catch (e) {
                log.error(`copy ${this.rootPath + "/README.md"} raise an error`, e);
            }
        }
        return this;
        // if (fs.existsSync(this.rootPath + "/package-lock.json")) {
        //     try {
        //         fs.copySync(this.rootPath + "/package-lock.json", this.dist + "/package-lock.json");
        //     } catch (e) {
        //         log.error("copy package-lock raise an error", e);
        //     }
        // }
    }

    public setVersion(): PackageInfo {
        const version = ConfigHelper.getPackageVersion();
        this.packageJson.version = version;
        log.info("PackageInfo.setVersion.version", this.packageJson.version);
        return this;
    }

    private mkdir(): void {
        try {
            fs.mkdirpSync(this.dist);
        } catch (error) {
            log.error("PackageInfo.mkdir.CAN_NOT_MKDIR", this.dist);
        }
    }
}

export default PackageInfo;
