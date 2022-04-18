#!/usr/bin/env node
import { green, red } from "colorette";
import { type ModuleFederationPluginOptions } from "webpack/lib/container/ModuleFederationPlugin.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import ConfigHelper from "./libs/ConfigHelper.js";
import Logger from "./libs/Logger.js";
import { CopyTask } from "./task/CopyTask.js";
import { HelperTask } from "./task/HelperTask.js";
import { IsomorphicPack } from "./task/IsomorphicPack.js";
import { ModuleFederatePack } from "./task/ModuleFederatePack.js";
import { PackageInfo } from "./task/PackageInfo.js";
import { PublishTask } from "./task/PublishTask.js";
import { ServerApiPack } from "./task/ServerApiPack.js";
import { ServerPack } from "./task/ServerPack.js";
import { StandalonePack } from "./task/StandalonePack.js";

const log = Logger("ProjectBuild");

export class ProjectBuild {
    private isDebugMode = false;
    private isWatchMode = false;
    private isRunServerMode = false;
    private isPublishMode = false;
    private isAnalyzMode = false;
    private isOnlyStandalone = false;
    private isHotReload = false;

    public async start() {
        try {
            await this.build();
            if (this.isPublishMode) {
                await this.publish();
            }
        } catch (e) {
            log.error(red("ProjectBuild error: "), e);
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

    public setOnlyStandalone(isOnlyStandalone) {
        this.isOnlyStandalone = isOnlyStandalone;
    }

    public setHotReloadMode(isHotReload) {
        this.isHotReload = isHotReload;
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
            if (!this.isOnlyStandalone) {
                const packageInfo = new PackageInfo();
                packageInfo
                    .setDebugMode(this.isDebugMode)
                    .setWatchMode(this.isWatchMode);
                await packageInfo.run();
                const copyTask = new CopyTask("./config", "./config");
                copyTask.setDebugMode(this.isDebugMode);
                await copyTask.run();
                // 2. 编译./src/isomorphic 代码
                const isomorphicClientPack = new IsomorphicPack();
                isomorphicClientPack
                    .setDebugMode(this.isDebugMode)
                    .setWatchMode(this.isWatchMode)
                    .setAnalyzMode(this.isAnalyzMode);
                isomorphicClientPack.setHotReloadMode(this.isDebugMode && this.isHotReload);
                await isomorphicClientPack.run();
                const shouldServerApiBuild = ConfigHelper.get("serverapi", false);
                if (shouldServerApiBuild) {
                    // 3. 编译./src/server/apis 服务端api代码
                    const serverApiPack = new ServerApiPack();
                    serverApiPack
                        .setWatchMode(this.isWatchMode)
                        .setDebugMode(this.isDebugMode);
                    await serverApiPack.run();
                }
                // 4. 编译./src/server 服务端代码
                const serverPack = new ServerPack();
                serverPack
                    .setAutoRun(this.isRunServerMode)
                    .setDebugMode(this.isDebugMode)
                    .setWatchMode(this.isWatchMode);
                serverPack.setHotReloadMode(this.isDebugMode && this.isHotReload);
                await serverPack.run();
                // 5. 编译module federation 代码
                const shouldModuleFederateBuild = ConfigHelper.get("federation", false) as ModuleFederationPluginOptions;
                if (shouldModuleFederateBuild && shouldModuleFederateBuild.exposes) {
                    const moduleFederatePack = new ModuleFederatePack();
                    moduleFederatePack
                        .setDebugMode(this.isDebugMode)
                        .setWatchMode(this.isWatchMode)
                    await moduleFederatePack.run();
                }
            }
            const shouldStandaloneBuild = ConfigHelper.get("standalone", false);
            if (shouldStandaloneBuild) {
                // 6. 编译./src/standalone 代码 
                const standalonePack = new StandalonePack();
                standalonePack
                    .setDebugMode(this.isDebugMode)
                    .setWatchMode(this.isWatchMode);
                await standalonePack.run();
            } else if (this.isOnlyStandalone) {
                throw new Error(`the value of 'standalone' field must be an object in ./config/configure.json while build with --ost argument`)
            }
            console.log(green("build success"));
        } catch (e) {
            log.error(red("ProjectBuild has error: "), e);
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
    if (argv.hotReload) {
        projectBuild.setHotReloadMode(true);
    }
    if (argv.analyz) {
        projectBuild.setAnalyzMode(true);
    }
    if (argv.onlystandalone) {
        projectBuild.setOnlyStandalone(true);
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
