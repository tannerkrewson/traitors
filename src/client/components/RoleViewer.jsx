import React, { Component } from "react";

export default class RoleViewer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            show: false,
        };
    }
    showPopup() {
        this.setState({
            show: true,
        });
    }
    hidePopup() {
        this.setState({
            show: false,
        });
    }
    render() {
        var roleMessage;
        if (this.props.role === "faithful") {
            roleMessage = (
                <>
                    <p className="so-h2">You are Faithful.</p>
                    <p>
                        Find the traitors before they sabotage three missions.
                    </p>
                </>
            );
        } else if (this.props.role === "traitor") {
            var otherTraitors = [];
            for (var i = 0; i < this.props.players.length; i++) {
                var thisPlayer = this.props.players[i];
                // if the player is a traitor and it's not us
                if (
                    thisPlayer.isTraitor &&
                    thisPlayer.id !== this.props.me.id
                ) {
                    otherTraitors.push(thisPlayer.name);
                }
            }
            roleMessage = (
                <>
                    <p className="so-h2 text-error">You are a Traitor.</p>
                    <p>Your fellow traitors:</p>
                    <ul className="font-bold">
                        {otherTraitors.map((name, i) => (
                            <li key={i}>{name}</li>
                        ))}
                    </ul>
                </>
            );
        }

        return (
            <div className="role-viewer relative">
                {this.state.show && (
                    // shown above the button only while it is held, so
                    // nobody can read it over your shoulder later
                    <div className="popover-body card absolute bottom-full left-1/2 z-10 mb-3 w-72 -translate-x-1/2 border border-base-content/30 bg-base-200 p-5 shadow-xl">
                        {roleMessage}
                    </div>
                )}
                <button
                    type="button"
                    className="btn btn-outline btn-lg w-full select-none"
                    onMouseDown={this.showPopup.bind(this)}
                    onMouseUp={this.hidePopup.bind(this)}
                    onTouchStart={this.showPopup.bind(this)}
                    onTouchEnd={this.hidePopup.bind(this)}
                    onTouchCancel={this.hidePopup.bind(this)}
                    onMouseLeave={this.hidePopup.bind(this)}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    Tap and hold to view your role
                </button>
            </div>
        );
    }
}
