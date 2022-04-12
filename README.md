# alcor
a mizar-based react project compile cli tool

npm install -g alcor

## alcor辅助mizar应用打包编译。应用目录结构应为：
    -config    用于存放配置文件的目录
       -app.json    用于配置应用的运行时信息，比如该应用的node服务启动端口、cdn地址等
       -configure.json   用于配置应用的编译配置，比如配置eslint plugin、配置stylelint plugin、配置less-loader等
    -src    应用代码源文件目录
       -isomorphic     同构内容所在目录，组件会被在客户端或服务端执行，需要注意执行环境特有能力的使用
          -index.ts     客户端启动入口
          -routers    应用的客户端路由文件所在目录
             -index.tsx
          -pages    页面所在的目录
             -pageA    一个采用类组件形式开发的页面级redux组件
                -index.tsx    页面组件入口文件
                -index.less    页面组件样式文件
                -action.ts    页面组件内所有action定义
                -initialState.ts    页面组件reducer需要使用的初始值定义
                -reducer.ts    页面组件reducer定义
                -interface.ts    页面组件内所有的ts定义文件
             -pageB
                - ...
          -typings
             -*.d.ts   额外需要的类型声明
          -tsconfig.json
       -public   存放一些非模块化的的内容，每个文件会被直接用link或script引入
       -server   应用的服务端代码
          -apis   服务端node api存放目录，规则是请求路径以/api/开头，文件名为方法名
                -api-name.ts
          -index.ts   服务端启动入口
    -.eslintignore
    -.eslintrc.js
    -.stylelintrc.json
    -package.json
    -tsconfig.json

### 1. 利用cli创建一个应用，包含文件、目录、配置
   * alcor create your-project-directory-path，在your-project-directory-path目录中创建一个应用，包含必要的文件、配置

### 2. 编译、打包、调试一个应用
   * alcor build  产出production环境的编译产出
   * alcor build --debug  产出development环境的编译产出
   * alcor build --verbose  编译过程在终端中打印出详细的编译过程、编译状态的信息
   * alcor build --server  会启动开发调试服务器，启动并连接node inspector用于调试node端代码
   * alcor build --hotReload   在同时指定--debug时，会启用客户端资源在浏览器中的热更新.**暂时不支持状态保持**
   * alcor build --analyz  产出webpack stats模块分析文件，如果联合--debug使用，会启动分析服务器并自动用默认浏览器打开分析页面
   * alcor build --watch  启动watch进程监听文件变更重新编译
   * alcor build --ost   传递该参数会忽略其他所有参数，该参数表示仅做standalone的编译：从./config/configure.json中读取standalone配置用于编译./src/standalone目录的文件
   * 可以组合使用比如 alcor build -ds 表示编译开发环境编译并启动开发调试服务器，
   * 0.1.39开始将debug能力拆解，debug不在默认监听文件变化，新增watch用于监听文件变化
   * 仅debug、watch、server可使用缩写，其他选项不可缩写，必须使用--的形式

### 3. 应用根目录中需要存在config文件夹，里面包含两个文件：app.json, configure.json。由于configure.json是用于打包编译的配置，编译产出dist目录中，只会包含用于发布的内容，因此不会包含configure.json
   * app.json用来配置应用信息和运行时信息
```
    "name": "alcor-template-app", # 应用名称
    "port": 8889, # 应用在服务端启动时的端口号
    "cdn": "/", # cdn 域名加根目录
    "assetsPathPrefix": "static/" # 静态资源路径前缀
```
   * configure.json用来配置打包编译过程中的一些配置
```
   "stylelint": true, #  启用stylelint，默认启用，默认配置对应用根目录src目录中的.css、.less、.scss、.sass文件生效
   "eslint": true, #  启用eslint，默认启用，默认配置对应用根目录src目录中的.ts\.tsx\.js\.jsx文件生效
   "postcss-loader": {}, #  配置插件option配置
   "less-loader": {}, #  配置插件option配置
   "sass-loader": {}, #  配置插件option配置
   "serverapi": true, #  配置是否产出/src/server/apis目录的服务端api内容
   "hotReload": {
        "host": "http://localhost",
        "port": 9911
   }, #  配置客户端热更新
   "proxy": [{}], #  配置debug模式的接口代理转发规则
   "standalone": {
      "externals": {
         "jquery": "jQuery"
      }
   } #  配置独立打包信息，参见下面第6点
```

### 4. 版本0.1.32(含)以前connect用法：connect()()()，0.1.33(含)以后用法：connect()()，会对第二次调用的中间两个缺省参数注入默认值

### 5. 版本0.1.33(含)以前支持应用路由配置语法为react-router-config v5语法，0.1.34(含)以后**只支持**react-router v6 useRoutes语法，[两个配置区别点击此处](https://reactrouter.com/docs/en/v6/upgrading/v5#use-useroutes-instead-of-react-router-config)。

### 6. 版本0.1.38开始支持standalone形式编译产出(ProjectBuild和PackageBuild都支持)，standalone代表每个standalone的文件之间没有公共文件，即哪怕在standalone中的文件有很多共同的内容也不会提取runtime、lib这种公共文件，他们是各自独立的，可以想象成每个standalone的文件就是一个第三方库，可以放在cdn，然后直接在html中以```<script>```的形式引入。
   * 在config/configure.json中增加standalone配置，value支持true、object。
   * true，表示会自动寻找src/standalone目录中的ts、js文件，每个文件分别作为入口，然后入口打包编译后的导出会赋值给用项目名命名的变量
   * object，里面的key是standalone/目录中的文件路径，value是object，可以配置导出内容的名称、导出类型等
   * 支持对standalone形式输出时，指定导入内容的排除，不会打包进最后的编译输出文件中，采用externals的形式支持。
   * 举例 1：
```
    config/configure.json:

    {
    ...
        "standalone": true
    ...
    }
    这个表示会将src/standalone目录中的ts、js文件作为入口，每个入口就是一个单独文件。每个独立文件导出的内容会被设置在项目名称命名的变量上。
```
   * 举例 2：
    存在下面这个目录结构 
```
      -src/standalone
         -component
            -login.tsx
         -logic
            -ui
               -component
                  -render.tsx
                  -loading.tsx
      -config
         -configure.json
      
      configure.json中有如下配置：

      "standalone": {
         "component/login": {
            "name": "login",
            "type": "this"
         },
         "logic/ui/component/render": {
            "name": "adRender",
            "type": "assign"
         },
         "externals": {
            "jquery": "jQuery"
         }
      }
```
   1. 会先自动收集standalone目录中的文件作为入口，因此此配置的standalone编译产出的入口文件有component/login、logic/ui/component/render、logic/ui/component/loading；
   2. 然后来和配置中standalone对象中的key进行比对，如果自动收集的入口在standalone中存在，则将该配置设置为此入口文件的配置，如果不在配置中存在，则入口的内容**不会被导出**。
   3. 编译时会在产出目录dist目录中创建一个standalone目录，生成component/login.js、logic/ui/component/render.js、logic/ui/component/loading.js文件，三个文件中包含各自的所有依赖，
   4. component/login配置了type:this，login的导出会挂载到运行时环境的this上，形式为this['login'],如果在浏览器端this就是window即window['login']，
   5. logic/ui/component/render配置了type:assign，render的导出会挂载到一个叫做adRender的变量上，
   6. 而logic/ui/component/loading没有standalone的配置，因此loading的导出的内容在最后的产出文件中不会有导出语句导出，此形式可用来编译web项目(即ProjectBuild）的standalone，因为web项目只需要被引用后执行内容，可以不具有导出。
   7. 同时因为存在externals，会影响所有standalone的入口文件，编译过程中引用的jquery都会被排除，不会打进最终文件中，jquery需要在html中直接引入，否则standalone的产出文件在运行时会报错。


### 7. 支持css module
   * 模块化样式文件的支持设计理念是：基于目录的规则，在/components?|pages?/目录内的所有.css|.less|.scss|.sass样式文件都会被当作模块化样式文件。
   * (基于目录的规则设计是因为上述目录中的组件对应样式都应该是模块化的，如果有不需要模块化的样式，说明是可以不专属于对应组件的，应该放在common或public目录，为了兼容个别特殊需要，文件名包含.module. ，同样视为模块化样式文件。）


### 8. debug模式支持接口代理转发
   * 本地开发的时候，需要请求后端数据，但是本地又没有对应api，此时可以在/config/configure.json里增加一个proxy配置，必须是个对象数组.
   * 所有通过转发的接口，都会默认改写真实请求到target域名的请求头Host和Referer字段。可通过增加changeOrigin: false配置来关闭两个改写操作，或仅增加changeOriginReferer: false配置来关闭改写Referer但保持改写Host的操作。
   * 配置说明：
```
    /config/configure.json:

    ...
    "proxy": [
      {
         path: "/ajax/api",
         config: {
            target: "http://target.com",
            changeOrigin: false, // 显示的关闭代理转发请求的时候更改请求头中的Host和Referer
            pathRewrite: {
               "^/ajax": "",
            },
         },
      }, // 如果请求/ajax/api/api1/getsomething,会被代理到http://target.com/api/api1/getsomething
      {
         path: "/user",
         config: {
            target: "http://user.com",
            pathRewrite: {
               "^/user/ajax": "/anotheruserpath",
            },
         }
      }, // 如果请求/user/ajax/getsomething,会被代理到http://user.com/anotheruserpath/getsomething
      ],
    ...
```

### 9. 支持微前端组件的构建和使用
   * 配置说明：
```
    host-app，启动端口8890，
    /config/configure.json:

    ...
    "federation": {
        "name": "hostapp",
        "remotes": {
            "micro_1": "micro_1@http://localhost:8891/static/client/federate/micro_1_remote.js"
        }
    }
    ...

    remote-app，启动端口8891，
    /config/configure.json:

    ...
    "federation": {
        "name": "micro_1",
        "filename": "micro_1_remote.js",
        "exposes": {
            "./counting": "./src/isomorphic/common/components/Counting",
            "./PageA": "./src/isomorphic/pages/PageA",
            "./PageB": "./src/isomorphic/pages/PageB"
        },
        "shared": [
            {
            "react": "~17.0.2",
            "react-dom": "~17.0.2",
            "react-redux": "~7.2.4",
            "redux": "~4.1.0",
        }]
    }
    ...
```

### 10. 支持自定义编译配置
   * 在项目根目录中如果存在./webpack.config目录，里面有各编译过程的配置js文件时，编译过程会自动读取js文件，与内置配置进行merge。
   * 各js文件：
      1. client.js - 自定义./src/iosmorphic目录的编译配置
      2. server.js - 自定义./src/server目录的编译配置
      3. api.js - 自定义./src/server/apis目录的编译配置
      4. standalone.js - 自定义./src/standalone目录的编译配置
      5. mf.js - 自定义./config/configure.json中federation字段导出的前端组件编译配置
   * 自定义配置js文件中需要导出一个function，该function需要返回一个webpack.Configuration类型的对象。
   * 举例：
```
    ./webpack.config/client.js 

    module.exports = function () {
       return {
          amd: {
             jQuery: true,
          },
          module: {
             rules: {
                ...
             }
          },
          externals: [
             ...
          ],
       };
    };
```
   