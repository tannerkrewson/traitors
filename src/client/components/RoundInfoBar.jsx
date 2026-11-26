import React, { Component } from "react";

import MissionBar from "./MissionBar";
import RoleViewer from "./RoleViewer";

export default class RoundInfoBar extends Component {
    render() {
        var me = this.props.me;
        var round = this.props.round;
        var ourRole = this.props.me.isTraitor ? "traitor" : "faithful";

        return (
            <div className="round-info-bar mt-4 flex flex-col gap-4 border-t border-base-content/20 pt-6">
                <MissionBar
                    missions={round.missions}
                    numberOfPlayers={round.players.length}
                />
                <RejectedTeams count={round.rejectedTeams} />
                <RoleViewer role={ourRole} players={round.players} me={me} />
                <p className="section-label">
                    {round.players.length - round.traitorCount} Faithful ·{" "}
                    {round.traitorCount} Traitors
                </p>
            </div>
        );
    }
}

// the traitors win if five teams in a row are rejected
function RejectedTeams({ count }) {
    return (
        <div
            className="section-label flex items-center justify-center gap-2"
            aria-label={count + " of 5 teams rejected in a row"}
        >
            Rejected teams
            {[1, 2, 3, 4, 5].map((n) => (
                <span
                    key={n}
                    className={
                        "size-2.5 rounded-full border " +
                        (n <= count
                            ? "border-error bg-error"
                            : "border-base-content/30")
                    }
                />
            ))}
        </div>
    );
}
