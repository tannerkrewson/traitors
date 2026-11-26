import React, { Component } from "react";

import SOButton from "./SOButton";

export default class CheckableButton extends Component {
    render() {
        // others watch the captain pick, so show their picks plainly
        if (this.props.disabled) {
            return (
                <div
                    className={
                        "btn btn-block pointer-events-none " +
                        (this.props.checked
                            ? "btn-primary"
                            : "btn-outline opacity-50")
                    }
                >
                    {this.props.children}
                </div>
            );
        }
        return (
            <SOButton
                onClick={this.props.onCheck}
                isGroup={true}
                primary={this.props.checked}
                pressed={!!this.props.checked}
            >
                <span className="truncate">{this.props.children}</span>
            </SOButton>
        );
    }
}
