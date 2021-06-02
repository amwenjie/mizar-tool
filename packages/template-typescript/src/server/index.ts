import WebServer from "mizar/server";
import { bootstrap } from "mizar/server/bootstrap";
import clientRouter from "../isomorphic/pageRouters";
import config from "../config";
import meta from "./meta";

(async () => {
    try {
        await bootstrap()([{
            path: "/detail/*",
            clientRouter,
        }], meta);
    } catch (e) {
        console.log("启动错误", e);
    }
})();
