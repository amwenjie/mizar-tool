import Component from "mizar/iso/Component";
import { connect } from "mizar/iso/connect";
import getLogger from "mizar/iso/utils/logger";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import Page from "../../common/components/Page/index";
import { IProps } from "./interface";
import { showVideoPlayer } from "./action";
import * as style from "./index.less";
const logger = getLogger().getLogger("videodetail component");

function JumpTo({url, text}) {
    const navigate = useNavigate();
    return (<a href="#" onClick={(e) => {
        e.preventDefault();
        navigate(url);
    }}>{text}</a>);
}

function ShowParam () {
    const {id} = useParams();
    return (<h4 className={style.title}>这是video detail {id} 页面</h4>)
}
class VideoDetail extends Component<IProps, {}> {
    public static async getInitialData(serverFetch, query, params) {
        logger.log("videodetail page server data okokokok. loader done");

        return {
            title: "video page",
            data: "video getInitialData ,time is : " + (new Date()).toLocaleString() + " , query: " + query.ad,
        };
    }

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        console.log('videodetail did mount');
        // this.changeText();
    }

    public render() {
        return (<Page>
            <div>这是每秒更新的新text：<span>{this.props.text}</span></div>
            <h4 className={style.title}>
                <ShowParam />
            </h4>
            <i>{this.props.data}</i>
            <JumpTo url="/detail/article/1111" text="去往article detail" />
        </Page>);
    }

    changeText() {
        this.props.dispatch(showVideoPlayer({
            text: Date.now()
        }));
        setTimeout(() => {
            this.changeText()
        }, 1000);
    }
}

export default connect()(VideoDetail);
