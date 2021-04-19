import { connect } from "mizar-ssrframe/iso/connect";
import * as React from "react";
import * as ReactDOM from "react-dom";
import Page from "../../common/components/Page";
import { IProps, IVideoPlayerParam } from "./interface";
import { articleDetailReducer } from "./reducer";
import * as css from "./main.less";

class ArticleDetail extends React.Component<IProps, {}> {
    public static async getInitialData(serverFetch, query, params) {
        // const a = await serverFetch({
        //     url: "/article/detail.api",
        //     params: { articleId: params.id },
        // });
        // console.log(a);
        return {
            title: "article page hahaha",
            data: "article server data",
        };
    }

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        console.log('articledetail did mount');
        // this.changeText();
    }

    public render() {
        const id = this.props.match.params.id;
        return (<Page>
            <h5 className={(css as any).articleName}>这是aritcle detail 页面</h5>
            <i>{this.props.data}</i>
            <a href="#" onClick={(e) => {
                e.preventDefault();
                this.props.history.push("/detail/video/1111?ad=detail");
            }}>去往video detail </a>
        </Page>);
    }
}

export default connect()(articleDetailReducer, "articleDetail")(ArticleDetail);
