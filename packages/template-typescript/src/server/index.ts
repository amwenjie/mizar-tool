import WebServer from "mizar-ssrframe/server";
import { bootstrap } from "mizar-ssrframe/server/bootstrap";
import clientRouter from "../isomorphic/pageRouter";
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
