#!/usr/bin/env node
import ora from "ora";
import yargs  from "yargs";
import { hideBin } from "yargs/helpers";
import { HelperTask } from "./tools/task/HelperTask";
import { PublishTask } from "./tools/task/PublishTask";
import { PackageInfo } from "./tools/task/PackageInfo";
import { ShellTask } from "./tools/task/ShellTask";
import { UglifyJSTask } from "./tools/task/UglifyJSTask";
import { CopyTask } from "./tools/task/CopyTask";
import Logger from "./tools/libs/Logger";

const argv:any = yargs(hideBin(process.argv)).argv as any;

const log = Logger("Build");
class Build {
    public async startup() {
        const taskSpinner = ora("prepare the environment...\r\n").start();
        const task = new HelperTask();
        // 清理及数据准备工作
        task.init();
        task.start();
        taskSpinner.succeed();
        const packageInfoSpinner = ora("process build target directory & packageInfo...\r\n").start();
        await task.cleanAsync();

        // 开始编译工作
        try {
            await new PackageInfo().run();
            packageInfoSpinner.succeed();
            const tsSpinner = ora("transform typescript file...\r\n").start();
            await new ShellTask("./tools").run("tsc", "-p");
            await new ShellTask("./bin").run("tsc", "-p");
            tsSpinner.succeed();
            const ugSpinner = ora("optimize...\r\n").start();
            await new UglifyJSTask().run();
            await new CopyTask("./packages", "./packages").run();
            ugSpinner.succeed();
        } catch (e) {
            log.error(e);
        }
        if (argv.publish) {
            // 开始发布任务
            await new PublishTask().start();
        }
        task.end();
    }

}
(async () => {
    new Build().startup();
})();
