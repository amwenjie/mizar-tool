import fs from "fs-extra";
import path from "path";
import { green, red, yellow } from "colorette";
import Logger from "../../Logger";

const log = Logger("connect-default-param-loader");

export default function (source) {
    const callback = this.async();
    const sourcePath = this.resourcePath;
    if (
        /[\\/]src[\\/]isomorphic[\\/].+[\\/][A-Z][^\\/]+[\\/]index\.tsx?$/.test(sourcePath)
        // || proceed.indexOf(sourcePath) > -1
    ) {
        const outterReg = /connect\s*\(.*?\)\s*\((.+?)\)(?:$|;)/;
        let outterMatched = outterReg.exec(source);
        // 先取出connect(xxxxx)(bbbbbbbbbbb)的bbbbbbbbb部分
        if (outterMatched) {
            const connectParamStr = outterMatched[1];
            const childComponentReg = /,\s*\[([^\]]+)\]/;
            const childComponentMatch =  childComponentReg.exec(connectParamStr);
            const excludeChildString = connectParamStr.replace(childComponentReg, "");
            // 再取出connect(xxxxx)(cccccccc, [dddddddddddd]) 的ccccccc部分，因为ddddddd部分中可能包含逗号，会干扰下面的处理
            // 下面的处理是根据逗号来split看有多少个参数，然后遍历参数，
            // 1、len == 3 说明参数完备，直接return；
            // 2、len == 2 再识别第二个参数，如果是字符串，说明是reduerName，需要注入reduerFunction，如果不是字符串，说明需要注入reduerName
            // 3、len == 1 说明需要自动注入reducer function和reduerName

            const paramArr = excludeChildString.split(/\s*,\s*/);
            const len = paramArr.length;
            if (len === 3) {
                callback(null, source);
                return;
            }

            const shouldInjectReducerName = len === 1 || !/'|"/.test(paramArr[1]);
            const shouldInjectReducer = len === 1 || /'|"/.test(paramArr[1]);
            const parsedPathObj = path.parse(sourcePath);
            const basenameArr = parsedPathObj.dir.split(path.sep);
            const componentName = basenameArr[basenameArr.length - 1];
            let emsg: string;
            if (shouldInjectReducer) {
                const firstLetterLowerCaseName = `${componentName.slice(0, 1).toLowerCase()}${componentName.slice(1)}`;
                const reducerPath = `${parsedPathObj.dir}${path.sep}reducer.ts`;

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
                        emsg = `cannot find default reducer function for the component: ${red(sourcePath)}`;
                        log.error(emsg);
                        callback(new Error(emsg), "");
                        return;
                    }
                } else {
                    emsg = `cannot find reducer file: ${red(reducerPath)}`;
                    callback(new Error(emsg), "");
                    return;
                }
            }
            if (shouldInjectReducerName) {
                paramArr[2] = `"${componentName}"`;
            }

            if (shouldInjectReducer || shouldInjectReducerName) {
                let str = outterMatched[1].replace(excludeChildString, paramArr.join(','));
                str = outterMatched[0].replace(outterMatched[1], str);
                callback(null, source.replace(outterMatched[0], str));
                return;
            }
        }
    }

    callback(null, source);
    return;
}