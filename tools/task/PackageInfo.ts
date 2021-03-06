import { red } from "colorette";
import fs from "fs-extra";
import Logger from "../libs/Logger.js";
import TaskBase from "../libs/TaskBase.js";
import { HelperTask } from "./HelperTask.js";

const log = Logger("PackageInfo");

export class PackageInfo extends TaskBase {
    constructor(taskName = "PackageInfo") {
        super(taskName);
    }

    protected async compile(): Promise<void> {
        log.info("->", "PackageInfo", HelperTask.taking());
        this.mkdir();
        this.outputPackageJson();
    }

    private outputPackageJson(): PackageInfo {
        try {
            fs.copySync(this.rootPath + "/package.json", this.dist + "/package.json");
        } catch (e) {
            log.error(red("copy package.json raise an error"), e);
        }
        if (fs.existsSync(this.rootPath + "/package-lock.json")) {
            try {
                fs.copySync(this.rootPath + "/package-lock.json", this.dist + "/package-lock.json");
            } catch (e) {
                log.error(red("copy package-lock.json raise an error"), e);
            }
        }
        if (fs.existsSync(this.rootPath + "/README.md")) {
            try {
                fs.copySync(this.rootPath + "/README.md", this.dist + "/README.md");
            } catch (e) {
                log.error(red(`copy ${this.rootPath + "/README.md"} raise an error`), e);
            }
        }
        return this;
    }

    private mkdir(): void {
        try {
            fs.mkdirpSync(this.dist);
        } catch (error) {
            log.error(red("PackageInfo.mkdir.CAN_NOT_MKDIR"), this.dist);
        }
    }
}

export default PackageInfo;
