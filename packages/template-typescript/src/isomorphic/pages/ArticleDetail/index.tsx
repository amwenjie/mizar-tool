import { connect } from "mizar/iso/connect";
import React from "react";
import Page from "../../common/components/Page";
import { IProps } from "./interface";
import { useNavigate, useLocation, useSearchParams} from "react-router-dom";
import getLogger from "mizar/iso/utils/logger";
import fetch from "mizar/iso/fetch";
// import loadable from '@loadable/component';
// const Counting = loadable(() => import('micro1_federate/counting')); // micro1_federate/counting需要在typings目录中增加声明

import * as css from "./index.less";

const logger = getLogger().getLogger('article');

function Jump ({text}) {
    const navigate = useNavigate();
    return (<a href="#" onClick={(e) => {
        e.preventDefault();
        navigate("/detail/video/111221?ad=video"+ 4444444);
    }}>{text}</a>);
}

function JumpToNowhere({text}) {
    const navigate = useNavigate();
    return (<a href="#" onClick={(e) => {
        e.preventDefault();
        navigate("/detail/232323/111999?ad=video"+ 4444444);
    }}>{text}</a>);
}

function ChangeSearch() {
    const [searchParam , setSearchParam] = useSearchParams();
    return <div>
        <div onClick={() => {alert(searchParam.get('query'))}}>get search</div>,
        <div onClick={() => {alert(setSearchParam({query:'query'}))}}>set search</div>
    </div>;
}

function ArticleDetail(props: IProps) {
    const navigate = useNavigate();
    const id = props.match ? props.match.params.id  : "null";
    return (<Page>
        {/* <Counting data={{count: props.data.count}}></Counting> */}
        <h5 className={css.articleName}>这是aritcle detail 页面{id}</h5>
        <i>{props.data.text}: id is: {id}</i>
        <p>
            <a className="hh-aa" href="#" onClick={(e) => {
                e.preventDefault();
                addCounting(props);
            }}>增加counting</a>
        </p>
        <Jump text="去往video detail " />
        <p>
            <a href="#" onClick={(e) => {
                e.preventDefault();
                navigate("/detail/232323/111999?ad=video"+ 4444444);
            }}>内嵌的a标签跳转，使用useNavigate</a>
        </p>
        <div>
            <JumpToNowhere text="去往不存在的页面 url " />
        </div>
        <div>
            <ChangeSearch></ChangeSearch>
        </div>
    </Page>);
}

ArticleDetail.getInitialData = async function getInitialData(initFetch, options) {
    initFetch({
        method: "POST",
        url: "/api/anypath/method/hahah",
        params: { articleId: options.params.id, query: 2 },
        data: {
            key: 1,
            key2: 2,
        }
    }).then(data => {
        console.log("拿到 initial data:", data);
    }).catch(e => {
        console.log("fetch error出错:", e);
    })
    // const result = [];
    // try {
    //     result =
    //         await Promise.all([
    //             initFetch({
    //                 url: "/api/firstpath/method/hahah",
    //                 params: { articleId: options.params.id },
    //             });
    //             initFetch({
    //                 url: "/api/secondpath/method/hahah",
    //                 params: { articleId: options.params.id },
    //             });
    //        ]);
    //    console.log(result);
    // } catch(e) {
    //     console.log("biz catch:");
    //     console.error(e)
    // }
    return {
        title: "article page 222hahahahhh",
        data: {
            count: -2,
            text: "article server data 223344 okokok.; params: "
            + JSON.stringify(options.params)
            + ", ****** query: "
            + JSON.stringify(options.query),
        },
    };
};

function addCounting(props) {
    props.dispatch({
        type:"vAddCount",
        data: {
            count: 333333
        }
    });
}

export default connect()(ArticleDetail);
