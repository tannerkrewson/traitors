import React, { Component } from "react";

import SOButton from "./SOButton";
import RoundInfoBar from "./RoundInfoBar";

export default class Drumroll extends Component {
    readyToViewResults() {
        this.props.server.readyToViewResults();
    }
    render() {
        var me = this.props.you;
        var round = this.props.round;
        return (
            <div className="drumroll">
                <p className="so-h2">
                    The results of mission {round.currentMission.number} are in
                </p>
                <p>Was it sabotaged? Reveal the results when you are ready.</p>
                <SOButton primary onClick={this.readyToViewResults.bind(this)}>
                    Reveal the results
                </SOButton>
                <RoundInfoBar round={round} me={me} />
            </div>
        );
    }
}
