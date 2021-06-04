import yargs  from "yargs";
import { hideBin } from "yargs/helpers";
// import log4js from "log4js";

const argv = yargs(hideBin(process.argv)).argv;

// log4js.configure({
//     appenders: {
//         default: {
//             type: "stdout",
//             layout: {
//                 type: "coloured",
//             },
//         }, // 控制台输出
//         file: {
//             type: "dateFile",
//             filename: 'logs/log.log',
//             pattern: "-yyyy-MM-dd",
//             alwaysIncludePattern: false,
//         },
//     },
//     categories: {
//         all: { appenders: ['default'], level: 'ALL' },
//         debug: { appenders: ['default'], level: 'debug' },
//         default: { appenders: ['default'], level: 'warn' },
//         error: { appenders: ['default'], level: 'error' },
//         logFile: { appenders: ['default', 'file'], level: 'ALL' },
//     },
//     replaceConsole: true,
// } as log4js.Configuration);

// export default (category = "default") => log4js.getLogger(category);

class Logger {
    private suffix: string = "";
    private supportMethods = ["log", "info", "warn", "error"];
    constructor(suffix) {
        this.suffix = suffix;
    }

    public debug(...args: any[]) {
        if (argv.verbose || argv.debug) {
            console.debug(this.suffix, ...args);
        }
    }
    public log(...args: any[]) {
        if (argv.verbose || argv.debug) {
            console.log(this.suffix, ...args);
        }
    }
    public info(...args: any[]) {
        this.log(...args);
    }
    public warn(...args: any[]) {
        console.warn(this.suffix, ...args);
    }
    public error(...args: any[]) {
        console.error(this.suffix, ...args);
    }
}

export default (category = "mizar-tool") => new Logger(category);