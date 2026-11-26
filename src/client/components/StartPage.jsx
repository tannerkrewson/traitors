import React, { Component } from "react";

import RoleViewer from "./RoleViewer";
import MissionBar from "./MissionBar";
import PlayerList from "./PlayerList";
import SOButton from "./SOButton";

export default class StartPage extends Component {
    componentDidMount() {
        if (this.props.you.isAdmin) {
            gtag("event", "game_start");
            gtag("event", "number_of_players", {
                event_label: this.props.round.players.length,
            });
        }
    }
    doneViewingStart() {
        this.props.server.doneViewingStart();
    }
    render() {
        var me = this.props.you;
        var data = this.props.round;

        var ourRole = me.isTraitor ? "traitor" : "faithful";

        return (
            <div className="round-info-bar flex flex-col gap-5">
                <p className="so-h2">Welcome to Traitors</p>
                <p>
                    Among you are {data.traitorCount} traitors. Check your role
                    in secret, then begin.
                </p>
                <RoleViewer role={ourRole} players={data.players} me={me} />
                <p className="section-label">Missions</p>
                <MissionBar
                    missions={data.missions}
                    numberOfPlayers={data.players.length}
                />
                <p className="section-label">Players</p>
                <PlayerList players={data.players} />
                <p className="section-label">
                    {data.players.length - data.traitorCount} Faithful ·{" "}
                    {data.traitorCount} Traitors
                </p>
                <SOButton primary onClick={this.doneViewingStart.bind(this)}>
                    Begin
                </SOButton>
            </div>
        );
    }
}
