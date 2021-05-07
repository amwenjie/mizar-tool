#!/usr/bin/env node
import { green } from "colorette";
import * as ora from "ora";
import * as yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { HelperTask } from "./task/HelperTask";
import { IsomorphicPack } from "./task/IsomorphicPack";
import { PublishTask } from "./task/PublishTask";
import { PackageInfo } from "./task/PackageInfo";
import { PublicAsset } from "./task/PublicAsset";
import { ServerPack } from "./task/ServerPack";
import { StylePack } from "./task/StylePack";
import Logger from "./libs/Logger";


const log = Logger();

export class ProjectBuild {
    private watchModel = false;
    private runServerModel = false;
    private publishModel = false;
    public async start() {
        try {
            await this.build();
            if (this.publishModel) {
                await this.publish();
            }
        } catch (e) {
            log.error("ProjectBuild", e);
        }
    }
    public setWatchModel(watchModel) {
        this.watchModel = watchModel;
    }
    public setPublishModel(publishModel) {
        this.publishModel = publishModel;
    }
    public setRunServer(runServerModel) {
        this.runServerModel = runServerModel;
    }
    private async publish() {
        await new PublishTask().start();
    }
    private async build() {
        let spinner;
        spinner = ora("prepare the environment...\r\n").start();
        // 环境准备
        const task = new HelperTask();
        task.setWatchModel(this.watchModel);
        task.init();
        task.start();
        spinner.succeed();
        try {
            spinner = ora("process target directory & packageInfo...\r\n").start();
            // 1 clean
            await task.cleanAsync();
            await new PackageInfo().setWatchModel(true).run();
            spinner.succeed();
            // await new PublicAsset().run();
            // 2. 生成样式
            spinner = ora("style pack...\r\n").start();
            await new StylePack()
                .setWatchModel(this.watchModel)
                .run();
            spinner.succeed();
            // 3. 生成ClientPack
            // const vendor = await new VendorPack()
            //     .setWatchModel(this.watchModel)
            //     .run();
            // 4. 生成同构下的ClientPack
            spinner = ora("client assets pack...\r\n").start();
            const isomorphicClientPack = new IsomorphicPack();
            isomorphicClientPack.setWatchModel(this.watchModel);
            // isomorphicClientPack.setVendorModel(vendor);
            await isomorphicClientPack.run();
            spinner.succeed();
            spinner = ora("server assets pack...\r\n").start();
            // 5. 生成ServerPack
            const serverPack = new ServerPack();
            serverPack.setAutoRun(this.runServerModel);
            serverPack.setWatchModel(this.watchModel);
            await serverPack.run();
            spinner.succeed();
            console.log(green("build success"));
        } catch (e) {
            spinner.fail();
            log.error("ProjectBuild raised an error: ", e);
        }
        task.end();
    }
}

(async () => {
    const projectBuild = new ProjectBuild();
    const argv = yargs(hideBin(process.argv)).argv;
    if (argv.watch) {
        projectBuild.setWatchModel(true);
    }
    if (argv.runServer) {
        projectBuild.setRunServer(true);
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
