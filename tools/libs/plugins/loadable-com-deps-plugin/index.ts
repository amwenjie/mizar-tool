import type { Compiler as WebpackCompiler, Compilation as WebpackCompilation, NormalModule } from "webpack";
import { dependencies } from "webpack";

const pluginName = "LoadableComDepsPlugin";

class PageRouterComDependency extends dependencies.NullDependency {
    constructor(module) {
        super();
        this.module = module;
    }
}

PageRouterComDependency.Template = class PageRouterComDependencyTemplate extends dependencies.NullDependency.Template {
    apply(dependency, source, templateContext) {
        console.log("&&&& dependency:");
        console.log(dependency);
        console.log("\r\n");

        console.log("&&&& source:");
        console.log(source);
        console.log("\r\n");

        console.log("&&&& templateContext:");
        console.log(templateContext);
        console.log("\r\n");
    }
}

export default class LoadableComDepsPlugin {
    apply(compiler: WebpackCompiler) {
        const webpack = compiler.webpack;
        compiler.hooks.normalModuleFactory.tap(pluginName, (factory) => {
            const handler = parser => {
                parser.hooks.expression.for("INSERT_CONTENT_HERE").tap("...", expr => {
                    console.log("^^^^^^ expr: ");
                    console.log(expr);
                    console.log("\r\n");
                    parser.state.module.addDependency(new PageRouterComDependency(expr.range))
                });
            };
            factory.hooks.parser
                .for("javascript/auto")
                .tap(pluginName, handler);
            factory.hooks.parser
                .for("javascript/dynamic")
                .tap(pluginName, handler);
            factory.hooks.parser
                .for("javascript/esm")
                .tap(pluginName, handler);
        });
        compiler.hooks.compilation.tap(pluginName, (compilation, { normalModuleFactory }) => {
            compilation.dependencyTemplates.set(
                PageRouterComDependency,
                new PageRouterComDependency.Template()
            )
            compilation.hooks.buildModule.tap(pluginName, (module: NormalModule) => {
                const { userRequest = "" } = module;
                if (/isomorphic\/pageRouters\//.test(userRequest)) {
                    console.log("****** userrequest: ", userRequest);
                    console.log("\r\n");
                    // module.addDependency(new PageRouterComDependency(module));
                }
            })
        });
    }
}