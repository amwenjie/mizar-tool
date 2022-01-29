#!/usr/bin/env node
import { green } from "colorette";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { CopyTask } from "./task/CopyTask";
import { HelperTask } from "./task/HelperTask";
import { IsomorphicPack } from "./task/IsomorphicPack";
import { PublishTask } from "./task/PublishTask";
import { PackageInfo } from "./task/PackageInfo";
import { ServerApiPack } from "./task/ServerApiPack";
import { ServerPack } from "./task/ServerPack";
import { StandalonePack } from "./task/StandalonePack";
import Logger from "./libs/Logger";
import { ConfigHelper } from "./libs/ConfigHelper";

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
        task.start();
        try {
            // 1 clean
            await task.cleanAsync();
            const packageInfo = new PackageInfo();
            packageInfo.setWatchMode(this.isWatchMode);
            await packageInfo.run();
            await new CopyTask("./config", "./config").run();
            // 2. 生成同构下的ClientPack
            const isomorphicClientPack = new IsomorphicPack();
            isomorphicClientPack
                .setDebugMode(this.isDebugMode)
                .setWatchMode(this.isWatchMode)
                .setAnalyzMode(this.isAnalyzMode);
            await isomorphicClientPack.run();
            // 3. 生成ServerApiPack
            const serverApiPack = new ServerApiPack();
            serverApiPack
                .setWatchMode(this.isWatchMode)
                .setDebugMode(this.isDebugMode);
            await serverApiPack.run();
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
