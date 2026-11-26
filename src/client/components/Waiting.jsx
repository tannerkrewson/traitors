import React, { Component } from "react";

import PlayerList from "./PlayerList";
import RoundInfoBar from "./RoundInfoBar";
import SOButton from "./SOButton";

export default class Waiting extends Component {
    render() {
        var me = this.props.you;
        var round = this.props.round;

        const disconnected = round.disconnectedList.length > 0;
        return (
            <div className="waiting">
                <p>{this.props.message}</p>
                <PlayerList players={round.waitingList} />
                {disconnected && (
                    <div className="alert alert-vertical alert-warning alert-soft">
                        <p>These players left the game:</p>
                        <PlayerList players={round.disconnectedList} />
                        <p>
                            The game will continue when someone joins the party
                            to take their place.
                        </p>
                        {me.isAdmin && (
                            <SOButton
                                onClick={() => this.props.server.endGame()}
                            >
                                End Game
                            </SOButton>
                        )}
                    </div>
                )}
                <RoundInfoBar round={round} me={me} />
            </div>
        );
    }
}
