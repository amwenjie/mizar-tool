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