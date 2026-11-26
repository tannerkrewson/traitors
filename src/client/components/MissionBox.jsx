import React, { Component } from "react";

const STATUS = {
    faithful: {
        mark: "✓",
        label: "passed",
        className: "border-primary bg-primary text-primary-content",
    },
    traitor: {
        mark: "✕",
        label: "failed",
        className: "border-error bg-error text-error-content",
    },
};

export default class MissionBox extends Component {
    render() {
        var status = STATUS[this.props.status];
        var inProgress = this.props.inProgress
            ? "ring-2 ring-primary ring-offset-2 ring-offset-base-100"
            : "";
        var caption = this.props.twoFails ? "2 fails" : "players";
        return (
            <li
                className={
                    "mission-box flex size-16 flex-col items-center justify-center rounded-full border text-[0.65rem] leading-none " +
                    (status ? status.className : "border-base-content/20") +
                    " " +
                    inProgress
                }
                aria-label={
                    "Mission " +
                    this.props.number +
                    ": " +
                    (status
                        ? status.label
                        : this.props.playersNeeded + " players")
                }
                aria-current={this.props.inProgress ? "step" : undefined}
            >
                <span className="opacity-70">#{this.props.number}</span>
                <span className="font-display text-2xl font-semibold">
                    {status ? status.mark : this.props.playersNeeded}
                </span>
                <span>{status ? status.label : caption}</span>
            </li>
        );
    }
}
