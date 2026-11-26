import React, { Component } from "react";

export default class PlayerBox extends Component {
    render() {
        return (
            <li className="badge badge-lg badge-outline player-box">
                {this.props.name}
            </li>
        );
    }
}
