/**
 * React Starter Kit (https://www.reactstarterkit.com/)
 *
 * Copyright © 2014-2016 Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

// var path = require("path")
import * as  cp from "child_process";
import Logger from "../libs/Logger";

const console = Logger();

// Should match the text string used in `src/server.js/server.listen(...)`
const RUNNING_REGEXP = /The server is running at http:\/\/(.*?)\//;

let server;

// Launch or restart the Node.js server
export function RunServer(serverPath, debug, cb: any = false) {
    let cbIsPending = !!cb;

    function onStdOut(data) {
        const time = new Date().toTimeString();
        const match = data.toString("utf8").match(RUNNING_REGEXP);
        // process.stdout.write(time.replace(/.*(\d{2}:\d{2}:\d{2}).*/, "[$1]") + " [INFO] server  - ");
        // console.info(time.replace(/.*(\d{2}:\d{2}:\d{2}).*/, "[$1] "))
        process.stdout.write(data);

        if (match) {
            server.stdout.removeListener("data", onStdOut);
            server.stdout.on("data", (x) => process.stdout.write(x));
            if (cb) {
                cbIsPending = false;
                cb(null, match[1]);
            }
        }
    }

    if (server) {
        console.warn("进程退出");
        server.kill("SIGTERM");
    }
    // server = cp.spawn("node", ["--inspect=9060", serverPath], {
    const params = [];
    if (debug > 0) {
        params.push("--inspect=" + debug);
    }
    params.push(serverPath);
    console.info("启动debug模式的服务", params);
    server = cp.spawn("node", params, {
        env: Object.assign(process.env, { NODE_ENV: "development" }),
        cwd: "build",
        // silent: false,
    });
    if (cbIsPending) {
        server.once("exit", (code, signal) => {
            if (cbIsPending) {
                throw new Error(`Server terminated unexpectedly with code: ${code} signal: ${signal}`);
            } else {
                console.warn("进程重启");
            }
        });
    }

    server.stdout.on("data", onStdOut);
    server.stderr.on("data", (x) => process.stderr.write(x));
    return server;
}

process.on("exit", () => {
    if (server) {
        console.warn("进程退出");
        server.kill("SIGTERM");
    }
});

// module.exports = runServer;
