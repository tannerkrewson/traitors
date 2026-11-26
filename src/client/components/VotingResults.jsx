import React, { Component } from "react";

import PlayerList from "./PlayerList";
import SOButton from "./SOButton";
import RoundInfoBar from "./RoundInfoBar";
import GetPlayer from "../utils/GetPlayer";
import TraitorList from "./TraitorList";

export default class VotingResults extends Component {
    doneViewingResults() {
        this.props.server.doneViewingVoteResults();
    }
    render() {
        var me = this.props.you;
        var round = this.props.round;

        var approveVotes = [];
        var rejectVotes = [];
        for (var i = 0; i < round.currentMission.votes.length; i++) {
            var ballot = round.currentMission.votes[i];
            var player = GetPlayer.byId(round.players, ballot.playerId);
            if (ballot.vote && player) {
                approveVotes.push(player);
            } else if (!ballot.vote && player) {
                rejectVotes.push(player);
            } else {
                console.log("Results error: invalid player");
            }
        }

        var votePassed = approveVotes.length > rejectVotes.length;
        var topMessage = "";
        var bodyMessage = "";
        if (votePassed) {
            topMessage += "The team is approved";
            bodyMessage += "The mission will now begin.";
        } else if (round.winner === "traitor") {
            topMessage += "The Traitors win";
            bodyMessage += "Five teams in a row were rejected.";
        } else {
            topMessage += "The team is rejected";
            bodyMessage += "A new captain will now select players.";
        }

        if (me.isAdmin) {
            gtag("event", "pre_mission_vote_result", {
                event_label: votePassed,
            });
            if (round.winner) {
                gtag("event", "game_result", {
                    event_label: "five_rejections",
                });
            }
        }

        return (
            <div className="selection-phase">
                <p className="so-h2">{topMessage}</p>
                <p className="so-h3">{bodyMessage}</p>
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                        <p className="section-label">
                            Approved ({approveVotes.length})
                        </p>
                        <PlayerList players={approveVotes} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <p className="section-label">
                            Rejected ({rejectVotes.length})
                        </p>
                        <PlayerList players={rejectVotes} />
                    </div>
                </div>
                {round.winner && <TraitorList players={round.players} />}
                <SOButton primary onClick={this.doneViewingResults.bind(this)}>
                    Next
                </SOButton>
                <RoundInfoBar round={round} me={me} />
            </div>
        );
    }
}
