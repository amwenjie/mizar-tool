# alcor-template-app

## 目录结构应为：
    -config    用于存放配置文件的目录
       -app.json   用于配置应用的运行时信息，比如该应用的node服务启动端口、cdn地址等
       -configure.json   用于配置应用的编译时信息，比如配置eslint plugin、配置stylelint plugin、配置less-loader等
    -src    应用代码源文件目录
       -isomorphic    同构内容所在目录，组件会被在客户端或服务端执行，需要注意执行环境特有能力的使用
          -index.ts    客户端启动入口
          -routers   应用的客户端路由文件所在目录，可以有多个路由配置，里面的每个文件都是路由所包含的页面组成的客户端单页入口应用的入口
             -index.tsx   文件中包含的页面组成的单页应用入口
          -pages    页面所在的目录
             -page A
             -page B
          -typings
             -*.d.ts   额外需要的类型声明
          -tsconfig.json
       -public   存放一些非模块化的的内容，每个文件会被直接用link或script引入
       -server   应用的服务端代码
          -apis   服务端node api存放目录，规则是请求路径以/api/开头，文件名为方法名
             -api-function.ts
          -index.ts   服务端启动入口
       -tsconfig.json
    -.babelrc
    -.eslintignore
    -.eslintrc.js
    -.stylelintrc.json
    -package.json
    -tsconfig.json

* 框架的应用参考https://github.com/amwenjie/mizar#readme