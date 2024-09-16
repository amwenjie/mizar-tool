import {
    type Compiler,
    type RuleSetRule,
    type WebpackPluginInstance,
} from "webpack";

export type webpackPluginsType = (
    | ((this: Compiler, compiler: Compiler) => void)
    | WebpackPluginInstance
);

export type webpackRulesType = (RuleSetRule | "...");

export interface sharePluginMapType {
    [plugin: string]: webpackPluginsType[];
}

export interface shareRuleMapType {
    [rule: string]: webpackRulesType[];
}

export interface cliArgv {
    debug?: boolean;
    watch?: boolean;
    hotReload?: boolean;
    runServer?: boolean;
    onlystandalone?: boolean;
    analyz?: boolean;
    verbose?: boolean;
    publish?: boolean;
};