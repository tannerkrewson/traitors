import React, { Component } from "react";

import PlayerList from "./PlayerList";
import SOButton from "./SOButton";

export default class Lobby extends Component {
    render() {
        var numPlayersInLobby = this.props.players.length;

        var startGame = () => {
            this.props.server.startGame();
        };

        // display how many more players are needed to start the game
        var playersNeededMessage = "";
        var notReady = false;
        // 3 or 4 players can play, with bots in the empty seats
        var numBots = numPlayersInLobby >= 3 ? 5 - numPlayersInLobby : 0;
        if (numPlayersInLobby < 3) {
            var numPlayersNeeded = 3 - numPlayersInLobby;
            var s = numPlayersNeeded === 1 ? "" : "s";
            playersNeededMessage =
                numPlayersNeeded + " more player" + s + " needed";
            notReady = true;
        } else if (numPlayersInLobby > 10) {
            var numPlayersNeedToLeave = numPlayersInLobby - 10;
            var s1 = numPlayersNeedToLeave === 1 ? "" : "s";
            var s2 = s1 === "s" ? "" : "s";
            playersNeededMessage =
                numPlayersInLobby -
                10 +
                " player" +
                s1 +
                " need" +
                s2 +
                " to leave";
            notReady = true;
        }

        return (
            <div className="lobby">
                <p className="so-h2">Gather your players</p>
                <PlayerList players={this.props.players} />
                <p className="section-label">{playersNeededMessage}</p>
                {numBots > 0 && (
                    <div className="rounded-box border border-base-content/15 p-4 text-left">
                        <p className="font-bold">
                            {numBots === 1 ? "A bot" : numBots + " bots"} will
                            fill the empty {numBots === 1 ? "seat" : "seats"}
                        </p>
                        <p className="mt-1 text-base-content/80">
                            Traitors is best with 5 or more people. With{" "}
                            {numPlayersInLobby}, bots take the other seats so
                            you still get a full game. They vote and go on
                            missions, and one might be a traitor, but they can't
                            argue their case and they're easier to read. Expect
                            a lighter, quicker game.
                        </p>
                    </div>
                )}
                <SOButton primary onClick={startGame} disabled={notReady}>
                    {numBots > 0
                        ? "Start with " +
                          (numBots === 1 ? "a bot" : numBots + " bots")
                        : "Start Game"}
                </SOButton>
            </div>
        );
    }
}
