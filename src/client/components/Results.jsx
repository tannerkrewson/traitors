import React, { Component } from "react";

import TraitorList from "./TraitorList";
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
            topMessage += " passed";
        } else if (currentMission.status === "traitor") {
            topMessage += " was sabotaged";
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

        const missions = (n) =>
            n + (n === 1 ? " more mission" : " more missions");
        if (faithfulWin) {
            // faithful won
            topMessage = "The Faithful win";
            bodyMessage +=
                "The traitors needed to sabotage " +
                missions(failedMissionsToTraitorWin) +
                ".\n";
        } else if (traitorsWin) {
            // traitors won
            topMessage = "The Traitors win";
            bodyMessage +=
                "The faithful needed to pass " +
                missions(passedMissionsToFaithfulWin) +
                ".\n";
        } else {
            bodyMessage +=
                "The faithful need to pass " +
                missions(passedMissionsToFaithfulWin) +
                ".\n";
            bodyMessage +=
                "The traitors need to sabotage " +
                missions(failedMissionsToTraitorWin) +
                ".\n";
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
                    {passVotes +
                        (passVotes === 1 ? " pass vote · " : " pass votes · ") +
                        failVotes +
                        (failVotes === 1 ? " sabotage" : " sabotages")}
                </p>
                <p className="whitespace-pre-line">{bodyMessage}</p>
                {(faithfulWin || traitorsWin) && (
                    <TraitorList players={data.players} />
                )}
                <SOButton primary onClick={this.doneViewingResults.bind(this)}>
                    Next
                </SOButton>
                <RoundInfoBar round={data} me={me} />
            </div>
        );
    }
}
