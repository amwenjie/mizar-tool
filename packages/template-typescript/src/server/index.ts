import WebServer from "mizar/server";
import { bootstrap } from "mizar/server/bootstrap";
import clientRouter from "../isomorphic/routers/index";
import meta from "./meta";

(async () => {
    try {
        await bootstrap()(clientRouter, meta);
    } catch (e) {
        console.log("启动错误", e);
    }
})();
