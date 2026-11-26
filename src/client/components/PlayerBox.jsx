import React, { Component } from "react";

// a name, not a control: outlined, so it never looks like a button
export default class PlayerBox extends Component {
    render() {
        return (
            <li className="player-box inline-flex items-center gap-1.5 rounded-full border border-base-content/20 px-3 py-0.5 text-base-content/90">
                {this.props.name}
                {this.props.isBot && <BotTag />}
            </li>
        );
    }
}

export function BotTag() {
    return <span className="text-xs text-base-content/50">bot</span>;
}
