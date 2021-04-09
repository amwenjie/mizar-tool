#!/usr/bin/env node
import * as yargs  from "yargs";
import { hideBin } from "yargs/helpers";
import { HelperTask } from "./tools/task/HelperTask";
import { PublishTask } from "./tools/task/PublishTask";
import { PackageInfo } from "./tools/task/PackageInfo";
import { ShellTask } from "./tools/task/ShellTask";
import { UglifyJSTask } from "./tools/task/UglifyJSTask";

class Build {
    public async startup() {
        const argv = yargs(hideBin(process.argv)).argv;
        console.log('build', argv);
        const task = new HelperTask();
        // 清理及数据准备工作
        task.init();
        task.start();
        await task.cleanAsync();

        // 开始编译工作
        try {
            await new PackageInfo().run();
            await new ShellTask().run("tsc -p ./tools");
            await new UglifyJSTask().run();
        } catch (e) {
            console.log(e);
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
