import React, { Component } from "react";

export default class PlayerBox extends Component {
    render() {
        return (
            <li className="badge badge-lg badge-neutral player-box">
                {this.props.name}
            </li>
        );
    }
}
