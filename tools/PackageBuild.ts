#!/usr/bin/env node
import { green } from "colorette";
import ora from "ora";
import yargs  from "yargs";
import { hideBin } from "yargs/helpers";
import { HelperTask } from "./task/HelperTask";
import { PublishTask } from "./task/PublishTask";
import { PackageInfo } from "./task/PackageInfo";
import { PublicAsset } from "./task/PublicAsset";
import { ShellTask } from "./task/ShellTask";
import Logger from "./libs/Logger";

const log = Logger("PackageBuild");

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
        spinner = ora("prepare the environment...\r\n").start();
        const task = new HelperTask();
        task.init();
        task.start();
        spinner.succeed();
        try {
            spinner = ora("process target directory & packageInfo...\r\n").start();
            await task.cleanAsync();
            await new PackageInfo().run();
            spinner.succeed();
            spinner = ora("public assets pack...\r\n").start();
            await new PublicAsset().setWatchModel(this.watchModel).run();
            await new PublicAsset("iso", "PublicAsset iso ").setWatchModel(this.watchModel).run();
            spinner.succeed();
            spinner = ora("transform typescript file...\r\n").start();
            await new ShellTask("./src").setWatchModel(this.watchModel).run("tsc", "-p");
            spinner.succeed();
            console.log(green("build success"));
            if (this.publishModel) {
                // 开始发布任务
                await new PublishTask().start();
            }
        } catch (e) {
            spinner.fail();
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
