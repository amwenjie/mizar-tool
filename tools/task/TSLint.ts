import Logger from "../libs/Logger";
import ShellTask from "./ShellTask";
const log = Logger("TSLint");
export class TSLint {
    public async run() {
        log.info("TSLint start");
        try {
            await new ShellTask("./src").run("tslint", "-p");
            log.info("TSLint is ok");
        } catch (error) {
            log.warn("代码规范&格式检查未通过，TSLint not ok");
        }
    }
}
