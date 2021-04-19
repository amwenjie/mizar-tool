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
    public async startup() {
        const argv = yargs(hideBin(process.argv)).argv;
        let spinner;
        spinner = ora("prepare the task environment...").start();
        log.log();
        const task = new HelperTask();
        task.init();
        task.start();
        spinner.succeed();
        try {
            spinner = ora("process build target directory & packageInfo...").start();
            log.log();
            await task.cleanAsync();
            await new PackageInfo().run();
            spinner.succeed();
            spinner = ora("public assets pack...").start();
            log.log();
            await new PublicAsset().run();
            await new PublicAsset("iso", "PublicAsset iso ").run();
            spinner.succeed();
            spinner = ora("transform ts file...").start();
            log.log();
            await new ShellTask().run("tsc -p src");
            spinner.succeed();
            log.log();
            if (argv.publish) {
                // 开始发布任务
                await new PublishTask().start();
            }
        } catch (e) {
            spinner.fail();
            log.log();
            log.error("PackageBuild", e);
        }
        task.end();
    }
}

(async () => {
    try {
        await new PackageBuild().startup();
    } catch (error) {
        process.exit(1);
    }
})();
