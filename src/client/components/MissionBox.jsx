import React, { Component } from "react";

const STATUS = {
    faithful: {
        label: "passed",
        className: "border-primary bg-primary text-primary-content",
        icon: <path d="M5 12.5l4.5 4.5L19 7.5" />,
    },
    traitor: {
        label: "sabotaged",
        className: "border-error bg-error text-error-content",
        icon: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
    },
};

export default class MissionBox extends Component {
    render() {
        var status = STATUS[this.props.status];
        var circleClass = status
            ? status.className
            : this.props.inProgress
              ? "border-2 border-primary bg-base-100 text-primary"
              : "border-base-content/20 bg-base-100 text-base-content/80";
        return (
            <li
                className="mission-box relative flex flex-col items-center gap-1.5"
                aria-label={
                    "Mission " +
                    this.props.number +
                    ": " +
                    (status
                        ? status.label
                        : this.props.playersNeeded + " players") +
                    (this.props.twoFails ? ", needs two sabotages" : "")
                }
                aria-current={this.props.inProgress ? "step" : undefined}
            >
                <span
                    className={
                        "flex size-11 items-center justify-center rounded-full border font-display text-2xl font-semibold " +
                        circleClass
                    }
                >
                    {status ? (
                        <svg
                            viewBox="0 0 24 24"
                            className="size-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            {status.icon}
                        </svg>
                    ) : (
                        this.props.playersNeeded
                    )}
                </span>
                {this.props.twoFails && (
                    <span className="absolute top-0 -right-0.5 size-2.5 rounded-full bg-error ring-2 ring-base-100" />
                )}
                <span
                    className={
                        "text-[0.7rem] " +
                        (this.props.inProgress
                            ? "text-primary"
                            : "text-base-content/55")
                    }
                >
                    Mission {this.props.number}
                </span>
            </li>
        );
    }
}
