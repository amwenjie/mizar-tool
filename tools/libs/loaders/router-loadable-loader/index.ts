export default function (source) {
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
            const loadableComp = `Loadable({
                loader: () => import('${matched[2]}'),
                loading: function () { return <div>loading...</div>;},
            })`;
            // injectArr.push(`const ${compName} = ${loadableComp};`);
            returnSource = returnSource.replace(matched[0], `component: ${loadableComp}, name: "${matched[3]}"`);
            matched = regexp.exec(source);
        }
        returnSource = injectArr + returnSource.replace("export default pageRouter;", "bootstrap(pageRouter)('app');export default pageRouter;");
        return returnSource;
    }
}