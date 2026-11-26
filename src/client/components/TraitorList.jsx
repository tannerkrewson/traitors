import React, { Component } from "react";

import PlayerList from "./PlayerList";

// revealed once the game is over
export default class TraitorList extends Component {
    render() {
        var traitors = this.props.players.filter((player) => player.isTraitor);
        return (
            <div className="flex flex-col gap-2">
                <p className="so-h3">The traitors were:</p>
                <PlayerList players={traitors} />
            </div>
        );
    }
}
