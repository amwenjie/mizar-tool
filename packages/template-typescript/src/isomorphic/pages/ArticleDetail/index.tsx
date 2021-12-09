import Component from "mizar/iso/Component";
import { connect } from "mizar/iso/connect";
import getLogger from "mizar/iso/utils/logger";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import Page from "../../common/components/Page";
import { IProps, IVideoPlayerParam } from "./interface";
import css from "./index.less";

const logger = getLogger().getLogger("article component");

function Jump ({text}) {
    const navigate = useNavigate();
    return (<a href="#" onClick={(e) => {
        e.preventDefault();
        navigate("/detail/video/1111?ad=video"+ 4444444);
    }}>{text}</a>);
}
class ArticleDetail extends Component<IProps, {}> {
    public static async getInitialData(serverFetch, query, params) {
        // const a = await serverFetch({
        //     url: "/article/detail.api",
        //     params: { articleId: params.id },
        // });
        // console.log(a);
        logger.log("article server data okokokok. loader done");
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

        return (<Page>
            <h5 className={(css as any).articleName}>这是aritcle detail 页面</h5>
            <i>{this.props.data}</i>
            <Jump text="去往video detail " />
        </Page>);
    }
}

export default connect()(ArticleDetail);
