#!/usr/bin/env node
import * as yargs  from "yargs";
import { hideBin } from "yargs/helpers";
import { HelperTask } from "./task/HelperTask";
import { PublishTask } from "./task/PublishTask";
import { PackageInfo } from "./task/PackageInfo";
import { PublicAsset } from "./task/PublicAsset";
import { ShellTask } from "./task/ShellTask";
import Logger from "./libs/Logger";

const console = Logger();

class PackageBuild {
    public async startup() {
        const argv = yargs(hideBin(process.argv)).argv;
        const task = new HelperTask();
        task.init();
        task.start();
        try {
            await task.cleanAsync();
            await new PackageInfo().run();
            await new PublicAsset().run();
            await new PublicAsset("iso", "PublicAsset iso ").run();
            await new ShellTask().run("tsc -p src");
            if (argv.publish) {
                // 开始发布任务
                await new PublishTask().start();
            }
        } catch (e) {
            console.error("PackageBuild", e);
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
