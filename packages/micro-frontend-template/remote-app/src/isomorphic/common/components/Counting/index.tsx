import React from "react";
import * as style from "./index.less";
export default (props) => {
    return (
        <div className={style.mfCounting}>
            {props && props.data.count}
        </div>
    );
};
