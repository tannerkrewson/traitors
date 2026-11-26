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
        var twoFails = numberOfPlayers >= 7;
        return (
            <div className="flex flex-col items-center gap-3">
                <ol className="mission-bar relative flex w-full max-w-sm justify-between">
                    {/* the track the missions sit on */}
                    <span
                        aria-hidden="true"
                        className="absolute top-[1.375rem] right-6 left-6 h-px bg-base-content/15"
                    />
                    {boxes}
                </ol>
                {twoFails && (
                    <p className="section-label flex items-center gap-2">
                        <span className="size-2 rounded-full bg-error" />
                        Mission 4 needs two sabotages to fail.
                    </p>
                )}
            </div>
        );
    }
}
