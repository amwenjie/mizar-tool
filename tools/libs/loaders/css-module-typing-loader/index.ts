import fs from "fs-extra";
import path from "path";
import NativeModule from "module";

function evalModuleCode(code) {
    const reg = /([^}]+\})/;
    const match = reg.exec(code);
    if (match) {
        const fileId = Date.now().toString() + ".js";
        const m = new NativeModule(fileId);
        // module.paths = NativeModule._nodeModulePaths({ context: __dirname });
        m.filename = fileId;
        // @ts-expect-error @typescript-eslint/ban-ts-comment
        m._compile(match[1], fileId);
        return m.exports;
    }
    return null;
}
function getTypingFilePath(filename) {
    const dirName = path.dirname(filename);
    const baseName = path.basename(filename);
    return path.join(dirName, `${baseName}.d.ts`);
}
function getExportedKeys(content) {
    const keys = [];
    try {
        const exportContent = evalModuleCode(content);
        if (exportContent) {
            return Object.keys(exportContent);
        }
    }
    catch (e) {
        console.error("css-module-typing-loader: can't parse mini-css-extract-plugin export.");
        console.error(e);
    }
    return keys;
}
function generateInterface(content) {
    const keys = getExportedKeys(content);
    if (keys.length) {
        const interfaceContent = keys.map(k => `        ${k}: string;`).join("\n");
        return `declare namespace ModuleStyleNamespace {
    export interface IModuleStyle {
${interfaceContent}
    }
}
declare const StyleModule: ModuleStyleNamespace.IModuleStyle;
export = StyleModule;`;
    }
    return "";
}
export default function loader(source) {
    const callback = this.async();
    if (/[\\/]node_modules[\\/]/i.test(this.resourcePath)) {
        callback(null, source);
        return;
    }
    try {
        const icontent = generateInterface(source);
        if (icontent) {
            const typingFilePath = getTypingFilePath(this.resourcePath);
            fs.writeFile(typingFilePath, icontent, { encoding: "utf8" });
        }
        callback(null, source);
    }
    catch (e) {
        callback(e, "");
    }
}
