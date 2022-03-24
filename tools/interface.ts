import {
    type Compiler,
    type RuleSetRule,
    type WebpackPluginInstance,
} from "webpack";

export type webpackPluginsType = (
    | ((this: Compiler, compiler: Compiler) => void)
    | WebpackPluginInstance
)[];

export type webpackRulesType = (RuleSetRule | "...")[];

export interface sharePluginMapType {
    [plugin: string]: webpackPluginsType;
}

export interface shareRuleMapType {
    [rule: string]: webpackRulesType;
}