import React, { Component } from "react";

import SOButton from "./SOButton";

export default class CheckableButton extends Component {
    render() {
        // others watch the captain pick, so show their picks plainly
        if (this.props.disabled) {
            return (
                <div
                    className={
                        "flex h-10 items-center justify-center gap-1.5 rounded-field border px-3 " +
                        (this.props.checked
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-base-content/15 text-base-content/50")
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
