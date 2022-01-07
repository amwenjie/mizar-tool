# mizar-tool
a mizar-based react project compile cli tool

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

3. 版本0.1.32(含)以前connect用法：connect()()()，0.1.33(含)以后用法：connect()()，会对第二次调用的中间两个缺省参数注入默认值

4. 版本0.1.33(含)以前支持应用路由配置语法为react-router-config v5语法，0.1.34(含)以后**只支持**react-router v6 useRoutes语法，[两个配置区别点击此处](https://reactrouter.com/docs/en/v6/upgrading/v5#use-useroutes-instead-of-react-router-config)。

5. 版本0.1.36开始支持standalone形式编译产出，standalone代表每个standalone的文件之间没有公共文件，即哪怕在standalone中的文件有很多共同的内容也不会提取runtime、vendor这种公共文件，他们是各自独立的，可以想象成每个standalone的文件就是一个第三方库，可以放在cdn，然后直接在html中以```<script>```的形式引入。
   * 在config/configure.json中增加standalone配置，value支持true、object。
   * true，表示会自动寻找src/standalone目录中的ts、js文件，每个文件分别作为入口，然后入口打包编译后的导出会赋值给用项目名命名的变量
   * object，里面的key是standalone/目录中的文件路径，value是object，可以配置导出内容的名称、导出类型等
   * 支持对standalone形式输出时，指定导入内容的排除，不会打包进最后的编译输出文件中，采用externals的形式支持。
   * 举例：
```
    config/configure.json:

    {
    ...
        "standalone": true
    ...
    }
    这个表示会将src/standalone目录中的ts、js文件作为入口，每个入口就是一个单独文件。每个独立文件导出的内容会被设置在项目名称命名的变量上。

    或
    {
    ...
        "standalone": {
            "component/login": {
               "name": "login",
               "type": "this"
            },
            "logic/ui/component/render": {
               "name": "adRender"
            },
            "externals": {
               "react": "React",
               "react-dom": "ReactDOM",
               "jquery": "jQuery"
            }
        }
    ...
    }
    这个表示会先自动将src/standalone目录中的ts、js文件作为入口，然后来和这个standalone对象中的key进行比对，如果自动获取的入口在standalone中存在，则将该配置设置为此入口文件的配置
    会在build目录中存在一个standalone目录，里面存在standalone/component/login.js、standalone/logic/ui/component/render.js文件，两个文件中包含各自的所有依赖，
    因为component/login配置了type，因此component/login的导出会挂载到运行时环境的this上，形式为this['login'],如果在浏览器端this就是window即window['login']，
    而logic/ui/component/render没有配置type，内部的所有导出会挂载到一个叫做adRender的变量上
    同时因为存在externals，会影响所有standalone的入口文件，编译过程中引用的react、jquery都会被排除，不会打进最终文件中，react、jquery可以在html中直接引入
```
