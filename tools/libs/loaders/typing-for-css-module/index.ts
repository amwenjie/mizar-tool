import fs from "fs-extra";
import path from "path";

function getTypingFilePath(filename: string): string {
    const dirName = path.dirname(filename);
    const baseName = path.basename(filename);
    return path.join(dirName, `${baseName}.d.ts`);
}

function getExportedKeys(content: string): string[] {
    const reg = /\bexport\s+var\s+(\w+)\s=/g;
    const keys = [];
    let matched;
    while(matched = reg.exec(content)) {
        keys.push(matched[1]);
    }
    return keys;
}

function generateInterface(content: string): string {
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

export default function (source) {
    const callback = this.async();
    if (/[\\/]node_modules[\\/]/i.test(this.resourcePath)){
        callback(null, source);
        return;
    }
    const icontent = generateInterface(source);
    if (icontent) {
        const typingFilePath = getTypingFilePath(this.resourcePath);
        fs.writeFile(typingFilePath, icontent, { encoding: "utf8" });
    }
    callback(null, source);
}