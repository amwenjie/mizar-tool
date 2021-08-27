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
        // 替换component: ()=>"xxxxx"或component:function(){return "xxxx";}或component: "xxxxx"形式的引用方式为同步引用
        return source.replace(
            /component\:\s*(?:(?:\(\s*\)\s*=>\s*)|(?:function\s*\(\s*\)\s*\{\s*return\s*))?("|')(.+pages\/([^"']+))\1(?:(?:\s*;)?\s*\})?/g,
            "component: require(\"$2\").default, name: \"$3\""
        );
    } else {
        // 替换component: "xxxxx"形式的引用方式为同步引用
        let returnSource = source.replace(
            /component\:\s*("|')(.+pages\/([^"']+))\1/g,
            "component: require(\"$2\").default, name: \"$3\""
        );
        // 替换component: ()=>"xxxxx"或component:function(){return "xxxx";}形式的引用方式为异步引用
        const regexp = /component\:\s*(?:(?:\(\s*\)\s*=>\s*)|(?:function\s*\(\s*\)\s*\{\s*return\s*))?("|')(.+pages\/([^"']+))\1(?:(?:\s*;)?\s*\})?/g;
        let matched;
        while (matched = regexp.exec(source)) {
            const skeleton = `${matched[3].replace(/(\/index(\.tsx)?)?$/, "")}/skeleton.tsx`;
            let loading = "function () { return <div>loading...</div>;}";
            if (fs.existsSync(Path.resolve(process.cwd(), "src/isomorphic/pages/", skeleton))) {
                loading = `require("../pages/${skeleton}").default`;
            }
            // /* webpackChunkName: "page/${matched[3]}" */ 
            const loadableComp = `Loadable({
                loader: () => import('${matched[2]}'),
                loading: ${loading},
            })`
            returnSource = returnSource.replace(matched[0], `component: ${loadableComp}, name: "${matched[3]}"`);
        }
        const injectArr = `import React from "react";
        import Loadable from "react-loadable";
        import { bootstrap } from "mizar/iso/bootstrap";
        `;
        returnSource = injectArr + returnSource.replace(/export\s+default\s+([^;\s]+)/, "bootstrap($1)('app');");
        // console.log("returnSource: ", returnSource);
        return returnSource;
    }
}