import fs from "fs-extra";
import Path from "path";

export default function (source) {
    const sourcePath = this.resourcePath;
    if (!/\/pageRouters\/.+\.tsx?$/.test(sourcePath)
        // || proceed.indexOf(sourcePath) > -1
    ) {
        return source;
    }
    let returnSource = "";
    const options = this.getOptions();
    const hasReactImported = /\s+from\s+("|')react\1/.test(source);

    if (options.IS_SERVER_RUNTIME) {
        // 替换element: ()=>"xxxxx"或element:function(){return "xxxx";}或element: "xxxxx"形式的引用方式为同步引用
        returnSource = source.replace(
            /element\:\s*(?:(?:\(\s*\)\s*=>\s*)|(?:function\s*\(\s*\)\s*\{\s*return\s*))?("|')(.+\/pages\/([^"']+))\1(?:(?:\s*;)?\s*\})?/g,
            "element: (comPath => {const $3 = require($1$2$1).default; return (<$3 />);})($1$2$1), name: $1$3$1"
            // "element: require($1$2$1).default, name: $1$3$1"
        );
    } else {
        // 替换element: "xxxxx"形式的引用方式为同步引用
        returnSource = source.replace(
            /element\:\s*("|')(.+pages\/([^"']+))\1/g,
            "element: (comPath => {const $3 = require($1$2$1).default; return (<$3 />);})($1$2$1), name: $1$3$1"
        );

        // 替换element: ()=>"xxxxx"或element:function(){return "xxxx";}形式的引用方式为异步引用
        const regexp = /element\:\s*(?:(?:\(\s*\)\s*=>\s*)|(?:function\s*\(\s*\)\s*\{\s*return\s*))?("|')(.+\/pages\/([^"']+))\1(?:(?:\s*;)?\s*\})?/g;
        let matched;
        while (matched = regexp.exec(source)) {
            const skeleton = `${matched[3].replace(/(\/index(\.tsx)?)?$/, "")}/skeleton.tsx`;
            let loading = "function () { return <div>loading...</div>;}";
            const quote = matched[1];
            if (fs.existsSync(Path.resolve(process.cwd(), "src/isomorphic/pages/", skeleton))) {
                loading = `require(${quote}../pages/${skeleton}${quote}).default`;
            }
            // /* webpackChunkName: "page/${matched[3]}" */ 
            // render: (loaded, props) => {
            //     const ${matched[3]} = loaded.default;
            //     return (<${matched[3]} />);
            // },
            const loadableComp = `(() => {
                const LoadableComp = Loadable({
                    loader: () => import(${quote}${matched[2]}${quote}),
                    loading: ${loading},
                });
                return (<LoadableComp />);
            })()`;

            returnSource = returnSource.replace(matched[0], `element: ${loadableComp}, name: ${quote}${matched[3]}${quote}`);
        }
        const injectArr = `import Loadable from "react-loadable";import { bootstrap } from "mizar/iso/bootstrap";`;
        
        returnSource = injectArr + returnSource.replace(/export\s+default\s+([^;\s]+)/, "export default $1; bootstrap($1)('app');");
        // console.log("returnSource: ", returnSource);
        // return returnSource;
    }
    if (!hasReactImported) {
        returnSource = `import React from "react";` + returnSource;
    }
    return returnSource
}