declare module '*.css' {
    type Primitive = string | number | boolean | null | undefined;
    const content: {
        [className: string]: string;
        (...names: Array<Primitive | Record<string, Primitive>>): string;
    };
    export default content;
}

declare module '*.less' {
    const content: {
        [className: string]: string
    };
    export default content;
}

declare module '*.scss' {
    const content: {
        [className: string]: string
    };
    export default content;
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