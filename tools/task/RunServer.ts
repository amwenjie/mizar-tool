/**
 * React Starter Kit (https://www.reactstarterkit.com/)
 *
 * Copyright © 2014-2016 Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

import { bold, green } from "colorette";
import spawn from 'cross-spawn';
import Logger from "../libs/Logger.js";

const log = Logger("RunServer");
// Should match the text string used in `src/server.js/server.listen(...)`
const RUNNING_REGEXP = /server start successful, listening at port: (\d+)/;
let server;

// Launch or restart the Node.js server
export default async function RunServer(serverPath: string, debug: number, cb: ((debugPort: number) => void) | false = false): Promise<void> {
    return new Promise(resolve => {
        let cbIsPending = !!cb;

        function onStdOut(data): void {
            // const time = new Date().toTimeString();
            const match = data.toString("utf8").match(RUNNING_REGEXP);
            // process.stdout.write(time.replace(/.*(\d{2}:\d{2}:\d{2}).*/, "[$1]") + " [INFO] server  - ");
            // log.info(time.replace(/.*(\d{2}:\d{2}:\d{2}).*/, "[$1] "))
            // process.stdout.write(data);

            if (match) {
                server.stdout.removeListener("data", onStdOut);
                console.log();
                console.log(bold(green("server start successful, listen at port: " + match[1])));
                console.log();
                server.stdout.on("data", data => process.stdout.write(data));
                if (typeof cb === "function") {
                    cbIsPending = false;
                    cb(parseInt(match[1], 10));
                }
                resolve();
            } else {
                process.stdout.write(data);
            }
        }

        if (server) {
            log.warn("server 进程即将 退出并重启...");
            server.kill("SIGINT");
        }
        const params = [];
        if (debug > 0) {
            params.push("--inspect=" + debug);
        }
        params.push(serverPath);
        log.info("启动debug server模式的服务", params);
        server = spawn("node", params, {
            env: {
                ...process.env,
                NODE_ENV: "development",
            },
            cwd: "dist",
            // silent: false,
        });
        if (cbIsPending) {
            server.once("exit", (code, signal) => {
                if (cbIsPending) {
                    throw new Error(`Server terminated unexpectedly with code: ${code} signal: ${signal}`);
                } else {
                    log.warn("进程重启");
                }
            });
        }

        server.stdout.on("data", onStdOut);
        server.stderr.on("data", data => process.stderr.write(data));
    });
}

process.on("exit", () => {
    if (server) {
        log.warn("server进程退出");
        server.kill("SIGINT");
        server = null;
    }
});
