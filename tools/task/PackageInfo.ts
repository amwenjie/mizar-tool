import { red } from "colorette";
import fs from "fs-extra";
import path from "node:path";
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
            const orig = path.resolve(this.rootPath, "package.json");
            const dist = path.resolve(this.dist, "package.json");
            fs.copySync(orig, dist);
        } catch (e) {
            log.error(red("copy package.json raise an error"), e);
        }
        // let orig = path.resolve(this.rootPath, "package-lock.json");
        // let dist = path.resolve(this.dist, "package-lock.json");
        // if (fs.existsSync(orig)) {
        //     try {
        //         fs.copySync(orig, dist);
        //     } catch (e) {
        //         log.error(red("copy package-lock.json raise an error"), e);
        //     }
        // }
        const orig = path.resolve(this.rootPath, "README.md");
        const dist = path.resolve(this.dist, "README.md");
        if (fs.existsSync(orig)) {
            try {
                fs.copySync(orig, dist);
            } catch (e) {
                log.error(red(`copy ${orig} raise an error`), e);
            }
        }
        return this;
    }

    private mkdir(): void {
        try {
            fs.mkdirpSync(this.dist);
        } catch (error) {
            log.error(red(`PackageInfo${error.message}`), this.dist);
        }
    }
}

export default PackageInfo;
