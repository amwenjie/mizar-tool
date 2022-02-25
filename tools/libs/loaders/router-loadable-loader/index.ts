export default function (source) {
    const callback = this.async();
    const sourcePath = this.resourcePath;
    let rplSource = source;
    if (
        /[\\/]src[\\/]isomorphic[\\/]routers(?:[\\/][^\\/]+?){1}\.tsx?$/.test(sourcePath)
    ) {
        const options = this.getOptions();
        if (options.IS_SERVER_RUNTIME) {
            rplSource = rplSource
                // .replace(/\bloadable\([^<]+?(<[^>]+?>)[^;,]+?([;,])/g, `$1$2`) // 匹配loadable(() => <IsoSsr count={9} />)的形式
                .replace(/\bloadable\([^"']+?import\((["'])([^\1]+?)\1[^;,]+?([;,])/g, `require("$2").default$3`);
        } else {
            rplSource = rplSource
                .replace(
                    /\bloadable\([^"']+?import\((["'])([^\1]+?)\1[^;,]+?([;,])/g,
                    `(() => { const LoadableCom = loadable(() => import("$2")); return (<LoadableCom />); })()$3`
                );
                // .replace(
                //     /\bloadable\([^<]+?(<[^>]+?>)[^,]+?([,])/g,
                //     `(() => { const LoadableCom = loadable(() => $1); return (<LoadableCom />); })(),`
                // );
        }
    }

    callback(null, rplSource);
    return;
}