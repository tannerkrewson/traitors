import React, { Component } from "react";

import SOButton from "./SOButton";
import Practice from "./Practice";

export default class Lobby extends Component {
    constructor(props) {
        super(props);
        this.state = { practicing: false };
    }
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
            playersNeededMessage =
                "Invite " +
                (numPlayersNeeded === 1 ? "1 more person" : "2 more people") +
                " to your party to play.";
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
        } else if (numBots === 0) {
            playersNeededMessage = "Everyone's here? Start when you're ready.";
        }

        // the table always shows at least five seats
        var seats = this.props.players.map((player) => player.name);
        while (seats.length < 5) seats.push(null);

        return (
            <div className="lobby">
                <p className="so-h2">Waiting for players</p>
                <ol className="grid grid-cols-2 gap-2">
                    {seats.map((name, i) => (
                        <li
                            key={i}
                            className={
                                "flex h-11 items-center justify-center truncate rounded-field border px-3 " +
                                (name
                                    ? "border-base-content/25"
                                    : "border-dashed border-base-content/15 text-base-content/35")
                            }
                        >
                            {name || "Open seat"}
                        </li>
                    ))}
                </ol>
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
                            you still get a full game. They vote
                            {this.props.mode === "banishment"
                                ? " at the round table"
                                : " and go on missions"}
                            , and one might be a traitor, but they can't argue
                            their case and they're easier to read. Expect a
                            lighter, quicker game.
                        </p>
                    </div>
                )}
                {!notReady && (
                    <SOButton primary onClick={startGame}>
                        {numBots > 0
                            ? "Start with " +
                              (numBots === 1 ? "a bot" : numBots + " bots")
                            : "Start Game"}
                    </SOButton>
                )}
                <div className="mt-4 flex flex-col gap-2 border-t border-base-content/15 pt-5">
                    <p className="font-display text-2xl">While you wait</p>
                    <p className="section-label">
                        Play a practice round against bots. Only you can see it,
                        and the real game takes over when it starts.
                    </p>
                    <SOButton
                        onClick={() => this.setState({ practicing: true })}
                    >
                        Play a practice round
                    </SOButton>
                </div>
                {this.state.practicing && (
                    <Practice
                        waiting={numPlayersInLobby}
                        onClose={() => this.setState({ practicing: false })}
                    />
                )}
            </div>
        );
    }
}
