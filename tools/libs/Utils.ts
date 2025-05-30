import { createHash } from "node:crypto";

export function checkIsLegalIdentifier(v: string): boolean {
    /**
     * A JavaScript identifier must start with a letter, underscore (_), or dollar sign ($). Subsequent characters can also be digits (0–9).
     */
    return /^[$a-zA-z_][$a-zA-z_0-9]+$/.test(v);
}

const cssModuleRegExp = /[\\/]components?[\\/]|[\\/]pages?[\\/]|\.module\.(?:css|less|s[ac]ss)$/i;

export function getCssModuleMode(resourcePath: string): "global" | "local" {
    if (cssModuleRegExp.test(resourcePath)) {
        return "local";
    }
    return "global";
}

export function shouldSourceModuled(resourcePath: string): boolean {
    return cssModuleRegExp.test(resourcePath);
}

export function getLocalIdentNamePrefix(pkgName: string) {
    let prefixProjectName = "";
    let prefixProjectNameHash = "";
    if (pkgName) {
        prefixProjectName = pkgName;
        if (!/[a-zA-Z_]/.test(pkgName[0])) {
            prefixProjectName = "_" + pkgName;
        }
        const hash = createHash('sha256');
        hash.update(pkgName);
        prefixProjectNameHash = hash.copy().digest('hex').slice(0, 8);
        if (!/[a-zA-Z_]/.test(prefixProjectNameHash[0])) {
            prefixProjectNameHash = "_" + prefixProjectNameHash;
        }
    }
    return [prefixProjectName, prefixProjectNameHash];
}