#!/usr/bin/env node
import yargs from "yargs";
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
    public async start() {
        const task = new HelperTask();
        task.start();
        await task.cleanAsync();

        // 开始编译工作
        try {
            await new PackageInfo().run();
            await new ShellTask("./tools").run("tsc", "-p");
            await new ShellTask("./bin").run("tsc", "-p");
            await new UglifyJSTask().run();
            await new CopyTask("./packages", "./packages").run();
        } catch (e) {
            log.error(e);
        }
        if (argv.publish) {
            // 开始发布任务
            await new PublishTask().run();
        }
        task.end();
    }

}
(async () => {
    try {
        await new Build().start();
    } catch (error) {
        process.exit(1);
    }
})();
