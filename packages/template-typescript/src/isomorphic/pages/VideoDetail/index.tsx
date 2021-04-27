import { connect } from "mizar/iso/connect";
import * as React from "react";
import * as ReactDOM from "react-dom";
import Page from "../../common/components/Page";
import { IProps, IVideoPlayerParam } from "./interface";
import { videoDetailReducer } from "./reducer";
import { showVideoPlayer } from "./action";
import * as cssStyle from "./main.less";
class VideoDetail extends React.Component<IProps, {}> {
    public static async getInitialData(serverFetch, query, params) {
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
        const id = this.props.match.params.id;
        return (<Page>
            <div>这是每秒更新的新text：<span>{this.props.text}</span></div>
            <h4 className={(cssStyle as any).title}>这是video detail 页面</h4>
            <i>{this.props.data}</i>
            <a href="#" onClick={(e) => {
                e.preventDefault();
                this.props.history.push("/detail/article/1111");
            }}>去往article detail</a>
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

export default connect()(videoDetailReducer, "videoDetail")(VideoDetail);
