import React from "react";

export default (props) => {
    return (
        <div>
            {props && props.children}
        </div>
    );
};
