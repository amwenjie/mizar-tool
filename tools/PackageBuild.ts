#!/usr/bin/env node
import * as ora from "ora";
import * as yargs  from "yargs";
import { hideBin } from "yargs/helpers";
import { HelperTask } from "./task/HelperTask";
import { PublishTask } from "./task/PublishTask";
import { PackageInfo } from "./task/PackageInfo";
import { PublicAsset } from "./task/PublicAsset";
import { ShellTask } from "./task/ShellTask";
import Logger from "./libs/Logger";

const log = Logger();

class PackageBuild {
    private watchModel = false;
    private publishModel = false;

    public setWatchModel(watchModel) {
        this.watchModel = watchModel;
    }

    public setPublishModel(publishModel) {
        this.publishModel = publishModel;
    }

    public async startup() {
        let spinner;
        spinner = ora("prepare the environment...").start();
        console.log();
        const task = new HelperTask();
        task.init();
        task.start();
        spinner.succeed();
        try {
            spinner = ora("process target directory & packageInfo...").start();
            console.log();
            await task.cleanAsync();
            await new PackageInfo().run();
            spinner.succeed();
            spinner = ora("public assets pack...").start();
            console.log();
            await new PublicAsset().setWatchModel(this.watchModel).run();
            await new PublicAsset("iso", "PublicAsset iso ").setWatchModel(this.watchModel).run();
            spinner.succeed();
            spinner = ora("transform ts file...").start();
            console.log();
            await new ShellTask("./src").setWatchModel(this.watchModel).run("tsc", "-p");
            spinner.succeed();
            console.log();
            if (this.publishModel) {
                // 开始发布任务
                await new PublishTask().start();
            }
        } catch (e) {
            spinner.fail();
            console.log();
            log.error("PackageBuild", e);
        }
        task.end();
    }
}

(async () => {
    try {
        const packageBuild = new PackageBuild();
        const argv = yargs(hideBin(process.argv)).argv;
        if (argv.watch) {
            packageBuild.setWatchModel(true);
        }
        if (argv.publish) {
            packageBuild.setPublishModel(true);
        }
        await packageBuild.startup();
    } catch (error) {
        process.exit(1);
    }
})();
