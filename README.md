# mizar-tool
a mizar-based react project compile\pack cli tool

npm install -g alcor

1. 利用cli创建一个应用，包含文件、目录、配置
   * alcor create your-project-directory-path，在your-project-directory-path目录中创建一个应用，包含必要的文件、配置

2. 编译、打包、调试一个应用
   * alcor build  产出production环境的编译产出
   * alcor build --debug  产出development环境的编译产出，并启动watch进程监听文件变更重新编译
   * alcor build --verbose  编译过程在终端中打印出详细的编译过程、编译状态的信息
   * alcor build --server  会启动开发调试服务器，启动并连接node inspector用于调试node端代码
   * alcor build --analyz  产出webpack stats模块分析文件，如果联合--debug使用，会启动分析服务器并自动用默认浏览器打开分析页面
   * 可以组合使用比如 alcor build -ds 表示编译开发环境编译并启动开发调试服务器，
   * 仅debug、server可使用缩写，其他选项不可缩写，必须使用--的形式

3. 0.1.32(含)以前connect用法：connect()()()，0.1.33(含)以后用法：connect()()，会对第二次调用的中间两个缺省参数注入默认值
