declare module '*.css' {
    namespace ModuleStyleNamespace {
        export interface IModuleStyle {
            [key: string]: string;
        }
    }
    const StyleModule: ModuleStyleNamespace.IModuleStyle;
    export = StyleModule;
}

declare module '*.less' {
    namespace ModuleStyleNamespace {
        export interface IModuleStyle {
            [key: string]: string;
        }
    }
    const StyleModule: ModuleStyleNamespace.IModuleStyle;
    export = StyleModule;
}

declare module '*.scss' {
    namespace ModuleStyleNamespace {
        export interface IModuleStyle {
            [key: string]: string;
        }
    }
    const StyleModule: ModuleStyleNamespace.IModuleStyle;
    export = StyleModule;
}
declare module '*.png' {
    const url: string;
    export default url;
}

declare module '*.svg' {
    const url: string;
    export default url;
}

declare module '*.svg?react' {
    import { type SVGAttributes, type ComponentType, type RefAttributes } from 'react';
    const Component: ComponentType<SVGAttributes<SVGElement> & RefAttributes<SVGElement>>;
    export default Component;
}