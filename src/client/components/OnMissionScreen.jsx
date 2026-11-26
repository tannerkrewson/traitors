import React, { Component } from "react";

import PlayerList from "./PlayerList";
import SOButton from "./SOButton";

export default class OnMissionScreen extends Component {
    voteYay() {
        this.props.server.missionVote(true);
    }
    voteNay() {
        this.props.server.missionVote(false);
    }
    render() {
        var data = this.props.round;
        var currentMission = data.currentMission;

        // data.players is all of the players in the game
        // currentMission.playersOnMission is only the players on the mission

        let twoFailNotice =
            currentMission.number === 4 && data.players.length >= 7;

        return (
            <div className="on-mission-screen">
                <p className="so-h3">
                    You are on mission
                    <span> {currentMission.number} </span>
                    with:
                </p>
                <PlayerList players={currentMission.playersOnMission} />
                {!twoFailNotice && (
                    <p>
                        Everyone must pass this mission for it to succeed. A
                        single sabotage will fail it.
                    </p>
                )}
                {twoFailNotice && (
                    <p>
                        This mission fails only if two or more players sabotage
                        it. A single sabotage is not enough.
                    </p>
                )}
                <p className="section-label">
                    Nobody will know how you voted, only how many passed and
                    sabotaged.
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <SOButton onClick={this.voteNay.bind(this)}>
                        Sabotage
                    </SOButton>
                    <SOButton primary onClick={this.voteYay.bind(this)}>
                        Pass
                    </SOButton>
                </div>
            </div>
        );
    }
}
