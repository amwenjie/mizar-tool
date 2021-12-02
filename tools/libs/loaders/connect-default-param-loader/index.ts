import fs from "fs-extra";
import Path from "path";
import { green, red, yellow } from "colorette";
import Logger from "../../Logger";

const log = Logger("connect-default-param-loader");

export default function (source) {
    const sourcePath = this.resourcePath;
    if (!/\/src\/isomorphic\/.+\/index\.tsx?$/.test(sourcePath)
        // || proceed.indexOf(sourcePath) > -1
    ) {
        return source;
    }
    const outterReg = /connect\s*\(.*?\)\s*\((.+?)\)(?:$|;)/;
    let outterMatched = outterReg.exec(source);
    // 先取出connect(xxxxx)(bbbbbbbbbbb)的bbbbbbbbb部分
    if (outterMatched) {
        const connectParamStr = outterMatched[1];
        const paramExceptChildComponentReg = /([^[]+)/;
        const innerMatched = paramExceptChildComponentReg.exec(connectParamStr);
        // 再取出connect(xxxxx)(cccccccc [dddddddddddd]) 的ccccccc部分，因为ddddddd部分中可能包含逗号，会干扰下面的处理
        // 下面的处理是根据逗号来split看有多少个参数，然后遍历参数，
        // 1、看是否是空字符串，是空字符串表示是[ddddddd]部分，
        // 2、看是否包含引号，有引号说明是reducerName的参数
        // 3、再结合参数个数，决定该默认给什么参数

        if (innerMatched) {
            const paramExceptChildComponent = innerMatched[1];
            const paramArr = paramExceptChildComponent.split(",");
            const len = paramArr.length;
            let hasChildComponent = false;
            let hasReducerName = false;
            for (let i = 0; i < len; i++) {
                if (/'|"/.test(paramArr[i])) {
                    // 简单判断，如果使用connect()(com, require('xxxx').default)的形式，会被误判为是reducerName
                    hasReducerName = true;
                } else if (/^\s*$/.test(paramArr[i])) {
                    hasChildComponent = true;
                }
            }
            if (len > 3 || len > 2 && !hasChildComponent) {
                return source;
            }
            let shouldInjectReducerName = !hasReducerName;
            let shouldInjectReducer = len === 1 
                || (len === 2 && hasReducerName || hasChildComponent)
                || hasReducerName && hasChildComponent;

            const parsedPathObj = Path.parse(sourcePath);
            const basenameArr = parsedPathObj.dir.split(Path.sep);
            const componentName = basenameArr[basenameArr.length - 1];
            if (shouldInjectReducer) {
                const firstLetterLowerCaseName = `${componentName.slice(0, 1).toLowerCase()}${componentName.slice(1)}`;
                const reducerPath = `${parsedPathObj.dir}${Path.sep}reducer.ts`;

                if (fs.existsSync(reducerPath)) {
                    const reducerContent = fs.readFileSync(reducerPath, "utf-8");
                    if (/export\s+default\s+function[^(]*\(/.test(reducerContent)) {
                        paramArr.splice(1, 0, `require("./reducer").default`);
                    } else if ((new RegExp(`export\\s+function\\s+${firstLetterLowerCaseName}Reducer\\s*\\(`)).test(reducerContent)) {
                        paramArr.splice(1, 0, `require("./reducer").${firstLetterLowerCaseName}Reducer`);
                    // const reducerExports = require(reducerPath);
                    // if (typeof reducerExports.default === "function") {
                    //     paramArr.splice(1, 0, `require(\"${reducerPath}").default`);
                    // } else if (typeof reducerExports[`${firstLetterLowerCaseName}Reducer`] === "function") {
                    //     paramArr.splice(1, 0, `require(\"${reducerPath}").${firstLetterLowerCaseName}Reducer`);
                    } else {
                        log.error(`cannot find default reducer function for the component: ${red(sourcePath)}`);
                        throw new Error(`cannot find default reducer function for the component: ${red(sourcePath)}`);
                    }
                } else {
                    log.error(`cannot find default reducer function for the component: ${red(sourcePath)}`);
                    throw new Error(`cannot find default reducer function for the component: ${red(sourcePath)}`);
                }
            }
            if (shouldInjectReducerName) {
                paramArr.splice(2, 0, `"${componentName}"`);
            }

            if (shouldInjectReducer || shouldInjectReducerName) {
                let str = outterMatched[1].replace(innerMatched[0], paramArr.join(','));
                str = outterMatched[0].replace(outterMatched[1], str);
                return source.replace(outterMatched[0], str);

            }
        }
    }

    return source;
}