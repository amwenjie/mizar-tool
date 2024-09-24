import WebServer from "mizar/server/index";
import { bootstrap } from "mizar/server/bootstrap";
import clientRouter from "../isomorphic/routers/index";
import meta from "./meta";

(async () => {



    try {
        const s = new WebServer({
            secureHeaderOptions: {
                contentSecurityPolicy: {
                    directives: {
                        connectSrc: ["'self'", "ws://localhost:9912"],
                    },
                },
                crossOriginResourcePolicy: { policy: "cross-origin" } 
            }
        })
        await bootstrap(s)(clientRouter, meta);
    } catch (e) {
        console.log("启动错误", e);
    }
})();
