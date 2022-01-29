#!/usr/bin/env node
import { green } from "colorette";
import yargs  from "yargs";
import { hideBin } from "yargs/helpers";
import { HelperTask } from "./task/HelperTask";
import { PublishTask } from "./task/PublishTask";
import { PackageInfo } from "./task/PackageInfo";
import { PublicAsset } from "./task/PublicAsset";
import { ShellTask } from "./task/ShellTask";
import { StandalonePack } from "./task/StandalonePack";
import Logger from "./libs/Logger";
import { ConfigHelper } from "./libs/ConfigHelper";

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
            await new PublicAsset().setWatchMode(this.isWatchMode).setDebugMode(this.isDebugMode).run();
            await new PublicAsset("iso", "PublicAsset iso ").setWatchMode(this.isWatchMode).setDebugMode(this.isDebugMode).run();
            await new ShellTask("./src").setWatchMode(this.isWatchMode).setDebugMode(this.isDebugMode).run("tsc", "-p");
            const shouldStandaloneBuild = ConfigHelper.get("standalone", false);
            if (shouldStandaloneBuild) {
                await new StandalonePack().setWatchMode(this.isWatchMode).setDebugMode(this.isDebugMode).run();
            }
            console.log(green("build success"));
            if (this.isPublishMode) {
                // 开始发布任务
                await new PublishTask().run();
            }
        } catch (e) {
            log.error("PackageBuild", e);
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
