/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./NormalModule")} NormalModule */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./javascript/JavascriptParser")} JavascriptParser */

/** @typedef {null|undefined|RegExp|Function|string|number|boolean|bigint|undefined} CodeValuePrimitive */
/** @typedef {RecursiveArrayOrRecord<CodeValuePrimitive|RuntimeValue>} CodeValue */

/**
 * @typedef {Object} RuntimeValueOptions
 * @property {string[]=} fileDependencies
 * @property {string[]=} contextDependencies
 * @property {string[]=} missingDependencies
 * @property {string[]=} buildDependencies
 * @property {string|function(): string=} version
 */

import type { Compiler } from "webpack";
import { NormalModule, ModuleGraph } from "webpack";

const pluginName = "LoadableComDepsPlugin";

export default class LoadableComDepsPlugin {
    // apply(compiler: WebpackCompiler) {
    //     const webpack = compiler.webpack;
    //     // compiler.hooks.normalModuleFactory.tap(pluginName, (factory) => {
    //     //     const handler = parser => {
    //     //         parser.hooks.expression.for("INSERT_CONTENT_HERE").tap("...", expr => {
    //     //             console.log("^^^^^^ expr: ");
    //     //             console.log(expr);
    //     //             console.log("\r\n");
    //     //             parser.state.module.addDependency(new PageRouterComDependency(expr.range))
    //     //         });
    //     //     };
    //     //     factory.hooks.parser
    //     //         .for("javascript/auto")
    //     //         .tap(pluginName, handler);
    //     //     factory.hooks.parser
    //     //         .for("javascript/dynamic")
    //     //         .tap(pluginName, handler);
    //     //     factory.hooks.parser
    //     //         .for("javascript/esm")
    //     //         .tap(pluginName, handler);
    //     // });
    //     compiler.hooks.compilation.tap(pluginName, (compilation, { normalModuleFactory }) => {
    //         // const handler = parser => {
    //         //     parser.hooks.varDeclaration.for("pageRouter").tap(pluginName, declaration => {
    //         //         console.log("\r\n");
    //         //         console.log("declaration: ", declaration);
    //         //         console.log("\r\nbuildDeps:");
    //         //         console.log(parser.state.module.buildInfo.buildDependencies);
    //         //         console.log("\r\nfileDeps:");

    //         //         console.log(parser.state.module.buildInfo.fileDependencies);
    //         //         console.log("\r\n");

    //         //     })
    //         // };
    //         // normalModuleFactory.hooks.parser.for("javascript/auto").tap(pluginName, handler);
    //         // normalModuleFactory.hooks.module.tap(pluginName, (module: NormalModule, createData, resolveData) => {
    //         //     const { userRequest = "" } = module;
    //         //     if (/\/src\/isomorphic\/pageRouters\/.+\.tsx?$/.test(userRequest)) {
    //         //         console.log("****** userrequest: ", userRequest);
    //         //         console.log("\r\n");
    //         //         console.log(module.dependencies);
    //         //         console.log("\r\n");
    //         //         console.log(createData);
    //         //         console.log("\r\n");
    //         //         console.log(resolveData);
    //         //         console.log("\r\n");

    //         //         // module.addDependency(new PageRouterComDependency(module));
    //         //     }
    //         //     return module;
    //         // });
    //         compilation.hooks.buildModule.tap(pluginName, (module: NormalModule) => {
    //             const { userRequest = "" } = module;
    //             if (/\/src\/isomorphic\/pageRouters\/.+\.tsx?$/.test(userRequest)) {
    //                 // console.log("****** userrequest: ", userRequest);
    //                 // console.log("\r\n");
    //                 // console.log(module.dependencies);
    //                 // console.log("\r\n");
    //                 compilation.moduleGraph.updateModule(new ModuleDependency("react"), module);
    //                 compilation.moduleGraph.updateModule(new ModuleDependency("react-loadable"), module);
    //                 compilation.moduleGraph.updateModule(new ModuleDependency("mizar/iso/bootstrap"), module);

    //                 console.log("\r\n");
    //                 console.log("*******", module.dependencies);
    //                 console.log("\r\n");
    //             }
    //         })
    //     });
    // }
}