export default function (source) {
    const options = this.getOptions();
    if (options.IS_SERVER_RUNTIME) {
        return source.replace(/component\:\s*("|')([^"']+)\1/g, "component: require(\"$2\").default");
    } else {
        let execSource = source;
        const regexp = /component\:\s*("|')(.+pages\/([^"']+))\1/g;
        let matched = regexp.exec(source);
        const injectArr = [`import "core-js/features/map";
            import "core-js/features/set";
            import "raf/polyfill";
            import * as React from "react";
            import * as Loadable from "react-loadable";
            import { bootstrap } from "mizar/iso/bootstrap";
        `];
        while (matched  !== null) {
            const compName = `loadable${matched[3]}`;
            const loadableComp = `Loadable({
                loader: () => import(\"${matched[2]}\"),
                loading: function () {
                    return React.createElement('div');
                },
            })`
            injectArr.push(`
                const ${compName} = ${loadableComp};
            `);
            execSource = execSource.replace(matched[0], `component: ${compName}`);
            matched = regexp.exec(source);
        }
        injectArr.push(execSource);
        injectArr.push(";bootstrap(pageRouter)('app');");
        return injectArr.join("");
    }
}