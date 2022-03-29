#!/usr/bin/env node
import { green, red } from "colorette";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import ConfigHelper from "./libs/ConfigHelper.js";
import Logger from "./libs/Logger.js";
import { HelperTask } from "./task/HelperTask.js";
import { PackageInfo } from "./task/PackageInfo.js";
import { PublicAsset } from "./task/PublicAsset.js";
import { PublishTask } from "./task/PublishTask.js";
import { ShellTask } from "./task/ShellTask.js";
import { StandalonePack } from "./task/StandalonePack.js";

const log = Logger("PackageBuild");

class PackageBuild {
    private isDebugMode = false;
    private isWatchMode = false;
    private isPublishMode = false;

    public setDebugMode(isDebugMode) {
        this.isDebugMode = isDebugMode;
    }

    public setWatchMode(isWatchMode) {
        this.isWatchMode = isWatchMode;
    }

    public setPublishMode(isPublishMode) {
        this.isPublishMode = isPublishMode;
    }

    public async startup() {
        const task = new HelperTask();
        task.start();
        try {
            await task.cleanAsync();
            await new PackageInfo().run();
            const publicAssets = new PublicAsset();
            publicAssets
                .setWatchMode(this.isWatchMode)
                .setDebugMode(this.isDebugMode);
            await publicAssets.run();
            const shellTask = new ShellTask("./src");
            shellTask
                .setWatchMode(this.isWatchMode)
                .setDebugMode(this.isDebugMode);
            await shellTask.run("tsc", "-p");
            const shouldStandaloneBuild = ConfigHelper.get("standalone", false);
            if (shouldStandaloneBuild) {
                const standalonePack = new StandalonePack();
                standalonePack
                    .setWatchMode(this.isWatchMode)
                    .setDebugMode(this.isDebugMode)
                await standalonePack.run();
            }
            console.log(green("build success"));
            if (this.isPublishMode) {
                // 开始发布任务
                await new PublishTask().run();
            }
        } catch (e) {
            log.error(red("PackageBuild"), e);
        }
        task.end();
    }
}

(async () => {
    try {
        const packageBuild = new PackageBuild();
        const argv = yargs(hideBin(process.argv)).argv as any;
        if (argv.debug) {
            packageBuild.setDebugMode(true);
        }
        if (argv.watch) {
            packageBuild.setWatchMode(true);
        }
        if (argv.publish) {
            packageBuild.setPublishMode(true);
        }
        await packageBuild.startup();
    } catch (error) {
        process.exit(1);
    }
})();
