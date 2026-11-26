import React, { Component } from "react";

import MissionBox from "./MissionBox";

export default class MissionBar extends Component {
    render() {
        var boxes = [];
        var numberOfPlayers = this.props.numberOfPlayers;
        this.props.missions.forEach(function (mission, i) {
            boxes.push(
                <MissionBox
                    number={mission.number}
                    status={mission.status}
                    playersNeeded={mission.playersNeeded}
                    inProgress={mission.inProgress}
                    // with 7 or more players, the 4th mission needs two fails
                    twoFails={mission.number === 4 && numberOfPlayers >= 7}
                    key={i}
                />,
            );
        });
        return (
            <ol className="mission-bar flex justify-center gap-1.5">{boxes}</ol>
        );
    }
}
