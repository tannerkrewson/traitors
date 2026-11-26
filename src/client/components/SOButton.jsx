import React, { Component } from "react";

export default class SOButton extends Component {
    render() {
        var groupClass = "";
        if (this.props.isGroup) {
            groupClass = "btn-block";
        }
        var styleClass = this.props.primary ? "btn-primary" : "btn-neutral";
        return (
            <button
                type={this.props.isSubmit ? "submit" : "button"}
                className={"btn sobutton " + styleClass + " " + groupClass}
                disabled={this.props.disabled}
                aria-pressed={this.props.pressed}
                onClick={this.props.onClick}
            >
                {this.props.children}
            </button>
        );
    }
}
