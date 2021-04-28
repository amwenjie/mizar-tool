import * as yargs  from "yargs";
import { hideBin } from "yargs/helpers";
import * as log4js from "log4js";

const argv = yargs(hideBin(process.argv)).argv;

log4js.configure({
    appenders: {
        default: {
            type: "stdout",
            layout: {
                type: "coloured",
            },
        }, // 控制台输出
        file: {
            type: "dateFile",
            filename: 'logs/log.log',
            pattern: "-yyyy-MM-dd",
            alwaysIncludePattern: false,
        },
    },
    categories: {
        all: { appenders: ['default'], level: 'ALL' },
        debug: { appenders: ['default'], level: 'debug' },
        default: { appenders: ['default'], level: 'warn' },
        error: { appenders: ['default'], level: 'error' },
        logFile: { appenders: ['default', 'file'], level: 'ALL' },
    },
    // replaceConsole: true,
} as log4js.Configuration);

export default (category = "default") => log4js.getLogger(category);