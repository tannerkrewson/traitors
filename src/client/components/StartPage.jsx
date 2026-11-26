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
            <div className="round-info-bar">
                <p className="so-h2">Welcome to Snakeout!</p>
                <RoleViewer role={ourRole} players={data.players} me={me} />
                <br />
                <p>Missions:</p>
                <MissionBar missions={data.missions} />
                <br />
                <p>Players:</p>
                <PlayerList players={data.players} />
                <p>
                    {data.players.length - data.traitorCount} loyalists |{" "}
                    {data.traitorCount} snakes
                </p>
                <SOButton onClick={this.doneViewingStart.bind(this)}>
                    Begin
                </SOButton>
            </div>
        );
    }
}
