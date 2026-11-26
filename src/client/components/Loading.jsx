import React, { Component } from "react";

export default class Loading extends Component {
    render() {
        return (
            <div>
                <p>
                    {this.props.message || "Waiting for the game to start..."}
                </p>
                <br />
            </div>
        );
    }
}
