import ShellTask from "./ShellTask";

export class TSLint {
    public async run() {
        console.log("TSLint start");
        try {
            await new ShellTask().run("tslint -p ./src");
            console.log("TSLint is ok");
        } catch (error) {
            console.log("代码规范&格式检查未通过，TSLint not ok");
        }
    }
}
