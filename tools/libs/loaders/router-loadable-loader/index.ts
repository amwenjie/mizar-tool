import fs from "fs-extra";
import Path from "path";

export default function (source) {
    const sourcePath = this.resourcePath;
    if (!/\/pageRouters\/.+\.tsx?$/.test(sourcePath)
        // || proceed.indexOf(sourcePath) > -1
    ) {
        return source;
    }
    const options = this.getOptions();
    if (options.IS_SERVER_RUNTIME) {
        return source.replace(/component\:\s*("|')(.+pages\/([^"']+))\1/g, "component: require(\"$2\").default, name: \"$3\"");
    } else {
        let returnSource = source;
        const injectArr = `import "core-js/features/map";
        import "core-js/features/set";
        import "core-js/features/promise";
        import "raf/polyfill";
        import React from "react";
        import Loadable from "react-loadable";
        import { bootstrap } from "mizar/iso/bootstrap";
        `;
        const regexp = /component\:\s*("|')(.+pages\/([^"']+))\1/g;
        let matched = regexp.exec(source);
        while (matched  !== null) {
            // const compName = `loadable${matched[3]}`;
            const skeleton = `${matched[3].replace(/(\/index(\.tsx)?)?$/, "")}/skeleton.tsx`;
            let loading = "function () { return <div>loading...</div>;}";
            if (fs.existsSync(Path.resolve(process.cwd(), "src/isomorphic/pages/", skeleton))) {
                loading = `require("../pages/${skeleton}").default`;
            }
            const loadableComp = `Loadable({
                loader: () => import(/* webpackChunkName: "page/${matched[3]}" */ '${matched[2]}'),
                loading: ${loading},
            })`;
            // injectArr.push(`const ${compName} = ${loadableComp};`);
            returnSource = returnSource.replace(matched[0], `component: ${loadableComp}, name: "${matched[3]}"`);
            matched = regexp.exec(source);
        }
        returnSource = injectArr + returnSource.replace("export default pageRouter;", "bootstrap(pageRouter)('app');export default pageRouter;");
        // console.log("returnSource: ", returnSource);
        return returnSource;
    }
}