import React, { Component } from "react";

import GetPlayer from "../utils/GetPlayer";
import CheckableButton from "./CheckableButton";
import { BotTag } from "./PlayerBox";

// props:
// players, list of players
// selectedPlayers, the players from the above list that should be checked
// onCheck, function that gets passed the player that was checked
export default class PlayerCheckboxes extends Component {
    render() {
        let boxes = [];

        let players = this.props.players;

        for (let i = 0; i < players.length; i++) {
            //see if this player has been selected
            var playerIsSelected = !!GetPlayer.byId(
                this.props.selectedPlayers,
                players[i].id,
            );

            var thisPlayerOnCheck = () => {
                if (this.props.onCheck) {
                    this.props.onCheck(players[i]);
                }
            };

            let thisBox = (
                <CheckableButton
                    checked={playerIsSelected}
                    onCheck={thisPlayerOnCheck}
                    key={i}
                    disabled={this.props.disabled}
                >
                    {players[i].name}
                    {players[i].isBot && <BotTag />}
                </CheckableButton>
            );

            boxes.push(thisBox);
        }

        return <div className="grid grid-cols-2 gap-2">{boxes}</div>;
    }
}
