#!/usr/bin/env node
import { green } from "colorette";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { CopyTask } from "./task/CopyTask.js";
import { HelperTask } from "./task/HelperTask.js";
import { IsomorphicPack } from "./task/IsomorphicPack.js";
import { ModuleFederatePack } from "./task/ModuleFederatePack.js";
import { PublishTask } from "./task/PublishTask.js";
import { PackageInfo } from "./task/PackageInfo.js";
import { ServerApiPack } from "./task/ServerApiPack.js";
import { ServerPack } from "./task/ServerPack.js";
import { StandalonePack } from "./task/StandalonePack.js";
import Logger from "./libs/Logger.js";
import ConfigHelper from "./libs/ConfigHelper.js";

const log = Logger("ProjectBuild");

export class ProjectBuild {
    private isDebugMode = false;
    private isWatchMode = false;
    private isRunServerMode = false;
    private isPublishMode = false;
    private isAnalyzMode = false;

    public async start() {
        try {
            await this.build();
            if (this.isPublishMode) {
                await this.publish();
            }
        } catch (e) {
            log.error("ProjectBuild", e);
        }
    }

    public setAnalyzMode(isAnalyzMode) {
        this.isAnalyzMode = isAnalyzMode;
    }

    public setDebugMode(isDebugMode) {
        this.isDebugMode = isDebugMode;
    }

    public setWatchMode(isWatchMode) {
        this.isWatchMode = isWatchMode;
    }

    public setPublishModel(isPublishMode) {
        this.isPublishMode = isPublishMode;
    }

    public setRunServerMode(isRunServerMode) {
        this.isRunServerMode = isRunServerMode;
    }

    private async publish() {
        await new PublishTask().run();
    }

    private async build() {
        // 环境准备
        const task = new HelperTask();
        task.setDebugMode(this.isDebugMode);
        task.start();
        try {
            // 1 clean
            await task.cleanAsync();
            const packageInfo = new PackageInfo();
            packageInfo
                .setDebugMode(this.isDebugMode)
                .setWatchMode(this.isWatchMode);
            await packageInfo.run();
            const copyTask = new CopyTask("./config", "./config");
            copyTask.setDebugMode(this.isDebugMode);
            await copyTask.run();
            // 2. 生成同构下的ClientPack
            const isomorphicClientPack = new IsomorphicPack();
            isomorphicClientPack
                .setDebugMode(this.isDebugMode)
                .setWatchMode(this.isWatchMode)
                .setAnalyzMode(this.isAnalyzMode);
            await isomorphicClientPack.run();
            const shouldServerApiBuild = ConfigHelper.get("serverapi", false);
            if (shouldServerApiBuild) {
                // 3. 生成ServerApiPack
                const serverApiPack = new ServerApiPack();
                serverApiPack
                    .setWatchMode(this.isWatchMode)
                    .setDebugMode(this.isDebugMode);
                await serverApiPack.run();
            }
            // 4. 生成ServerPack
            const serverPack = new ServerPack();
            serverPack
                .setAutoRun(this.isRunServerMode)
                .setDebugMode(this.isDebugMode)
                .setWatchMode(this.isWatchMode);
            await serverPack.run();
            const shouldStandaloneBuild = ConfigHelper.get("standalone", false);
            if (shouldStandaloneBuild) {
                // 5. 生成standalone文件
                const standalonePack = new StandalonePack();
                standalonePack
                    .setDebugMode(this.isDebugMode)
                    .setWatchMode(this.isWatchMode);
                await standalonePack.run();
            }
            const shouldModuleFederateBuild = ConfigHelper.get("federation", false);
            if (shouldModuleFederateBuild && shouldModuleFederateBuild.exposes) {
                const moduleFederatePack = new ModuleFederatePack();
                moduleFederatePack
                    .setDebugMode(this.isDebugMode)
                    .setWatchMode(this.isWatchMode)
                await moduleFederatePack.run();
            }
            console.log(green("build success"));
        } catch (e) {
            log.error("ProjectBuild raised an error: ", e);
        }
        task.end();
    }
}

(async () => {
    const projectBuild = new ProjectBuild();
    const argv = yargs(hideBin(process.argv)).argv  as any;
    if (argv.debug) {
        projectBuild.setDebugMode(true);
    }
    if (argv.watch) {
        projectBuild.setWatchMode(true);
    }
    if (argv.runServer) {
        projectBuild.setRunServerMode(true);
    }
    if (argv.analyz) {
        projectBuild.setAnalyzMode(true);
    }
    // if (argv.publish) {
    //     projectBuild.setPublishModel(true);
    // }
    try {
        await projectBuild.start();
    } catch (error) {
        process.exit(1);
    }
})();
