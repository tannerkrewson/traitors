import React, { Component } from "react";

import PlayerList from "./PlayerList";
import SOButton from "./SOButton";
import RoundInfoBar from "./RoundInfoBar";

export default class Results extends Component {
    doneViewingResults() {
        this.props.server.doneViewingResults();
    }
    render() {
        var me = this.props.you;
        var data = this.props.round;
        var currentMission = data.currentMission;

        var topMessage = "Mission " + currentMission.number;
        var bodyMessage = "";
        if (currentMission.status === "faithful") {
            topMessage += " passed!";
        } else if (currentMission.status === "traitor") {
            topMessage += " failed.";
        } else {
            console.log(
                "Results error A: mission status bad type: " +
                    currentMission.status,
            );
        }

        // figure out how many missions each team has to pass/fail before they win
        var passedMissionsToFaithfulWin = 3;
        var failedMissionsToTraitorWin = 3;
        for (var i = 0; i < data.missions.length; i++) {
            var thisMission = data.missions[i];
            if (thisMission.status === "faithful") {
                passedMissionsToFaithfulWin--;
            } else if (thisMission.status === "traitor") {
                failedMissionsToTraitorWin--;
            }
        }

        // count types of votes
        var passVotes = 0;
        var failVotes = 0;
        for (var i = 0; i < currentMission.missionVotes.length; i++) {
            var ballot = currentMission.missionVotes[i];
            if (ballot.vote) {
                passVotes++;
            } else {
                failVotes++;
            }
        }

        const faithfulWin = passedMissionsToFaithfulWin === 0;
        const traitorsWin = failedMissionsToTraitorWin === 0;

        if (faithfulWin) {
            // loyalists won
            topMessage = "Loyalists win!";
            bodyMessage +=
                "Snakes needed " +
                failedMissionsToTraitorWin +
                " more failing missions to win.\n";
        } else if (traitorsWin) {
            // snakes won
            topMessage = "Snakes win!";
            bodyMessage +=
                "Loyalists needed " +
                passedMissionsToFaithfulWin +
                " more passing missions to win.\n";
        } else {
            bodyMessage +=
                "Loyalists need " +
                passedMissionsToFaithfulWin +
                " more passing missions to win.\n";
            bodyMessage +=
                "Snakes need " +
                failedMissionsToTraitorWin +
                " more failing missions to win.\n";
        }

        // if the game is over, reveal who was a snake
        var TraitorList = <div />;
        if (
            passedMissionsToFaithfulWin === 0 ||
            failedMissionsToTraitorWin === 0
        ) {
            //get this round's snakes
            var traitors = [];
            data.players.forEach(function (player) {
                if (player.isTraitor) {
                    traitors.push(player);
                }
            });

            TraitorList = (
                <div>
                    <p className="so-h3">The snakes this round were:</p>
                    <PlayerList players={traitors} />
                </div>
            );
        }

        if (me.isAdmin && (faithfulWin || traitorsWin)) {
            let winner = faithfulWin ? "faithful" : "traitor";
            gtag("event", "game_result", {
                event_label: winner,
            });
        }

        if (me.isAdmin) {
            gtag("event", "mission_result", {
                event_label: currentMission.status,
            });
        }

        return (
            <div className="selection-phase">
                <p className="so-h2">{topMessage}</p>
                <p className="so-h3">
                    {passVotes + " pass votes | " + failVotes + " fail votes"}
                </p>
                <p className="so-h3">{bodyMessage}</p>
                {TraitorList}
                <SOButton onClick={this.doneViewingResults.bind(this)}>
                    Next
                </SOButton>
                <RoundInfoBar round={data} me={me} />
            </div>
        );
    }
}
