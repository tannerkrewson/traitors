import React, { Component } from "react";

import PlayerBox from "./PlayerBox";

export default class PlayerList extends Component {
    render() {
        return (
            <ul className="flex flex-wrap justify-center gap-2">
                {this.props.players.map((player, i) => (
                    <PlayerBox
                        name={player.name}
                        isBot={player.isBot}
                        key={i}
                    />
                ))}
            </ul>
        );
    }
}
