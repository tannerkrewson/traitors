import React, { Component } from "react";

import Footer from "./components/Footer";
import Loading from "./components/Loading";
import Lobby from "./components/Lobby";
import Replace from "./components/Replace";
import StartPage from "./components/StartPage";
import Waiting from "./components/Waiting";
import SelectionPhase from "./components/SelectionPhase";
import CaptainWaiting from "./components/CaptainWaiting";
import VotingPhase from "./components/VotingPhase";
import VotingResults from "./components/VotingResults";
import MissionPhase from "./components/MissionPhase";
import Drumroll from "./components/Drumroll";
import Results from "./components/Results";

import Connection from "./utils/Connection";

export default class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            page: Loading,
            error: "",
            connection: window.nova && window.nova.connectionStatus,
        };

        this.changePage = (page, pageProps) => {
            this.setState({ page, pageProps });
        };

        if (!window.nova) return;

        var self = this;
        this.server = new Connection(function (data) {
            var round = data.round;
            var me = data.you;

            self.setState({ error: "" });

            // between games
            if (!round) {
                self.changePage(Lobby, { players: data.lobby });
                return;
            }

            // joined while a game is going
            if (!me) {
                if (round.disconnectedList.length > 0) {
                    self.changePage(Replace, round);
                } else {
                    self.changePage(Loading, {
                        message:
                            "A game is in progress. You will be dealt in next game.",
                    });
                }
                return;
            }

            // the party leader sends the game's analytics events
            me.isAdmin =
                self.server.nova.player?.id === self.server.nova.leaderId;

            //determine if the server is waiting on us
            var isWaiting = (function () {
                for (var i = 0; i < round.waitingList.length; i++) {
                    if (me.id === round.waitingList[i].id) {
                        return true;
                    }
                }
                return false;
            })();

            data.message = "";
            switch (round.phase) {
                case "start":
                    if (isWaiting) {
                        self.changePage(StartPage, data);
                    } else {
                        data.message = "Waiting to begin the game...";
                        self.changePage(Waiting, data);
                    }
                    break;
                case "selection":
                    if (me.isCaptain) {
                        self.changePage(SelectionPhase, data);
                    } else {
                        //find out who's captain
                        for (var i = 0; i < round.players.length; i++) {
                            if (round.players[i].isCaptain) {
                                data.message +=
                                    round.players[i].name +
                                    " is selecting players for ";
                                break;
                            }
                        }
                        data.message +=
                            "mission " + round.currentMission.number + "...";
                        self.changePage(CaptainWaiting, data);
                    }

                    break;
                case "voting":
                    //determine if we have already voted
                    if (isWaiting) {
                        self.changePage(VotingPhase, data);
                    } else {
                        data.message = "Waiting for players to vote...";
                        self.changePage(Waiting, data);
                    }
                    break;
                case "voting_results":
                    if (isWaiting) {
                        self.changePage(VotingResults, data);
                    } else {
                        data.message =
                            "Waiting for everyone to finish viewing the results...";
                        self.changePage(Waiting, data);
                    }
                    break;
                case "mission":
                    //figure out if we are on this mission
                    var isOnMission = false;
                    for (
                        var i = 0;
                        i < round.currentMission.playersOnMission.length;
                        i++
                    ) {
                        var thisPlayer =
                            round.currentMission.playersOnMission[i];
                        if (thisPlayer.id === me.id) {
                            isOnMission = true;
                            break;
                        }
                    }

                    //if we are on the mission, figure out if we've voted already
                    if (isOnMission && isWaiting) {
                        self.changePage(MissionPhase, data);
                    } else {
                        data.message = "Waiting for the mission to complete...";
                        self.changePage(Waiting, data);
                    }

                    break;
                case "drumroll":
                    if (isWaiting) {
                        self.changePage(Drumroll, data);
                    } else {
                        data.message =
                            "Waiting for everyone to be ready to view the results...";
                        self.changePage(Waiting, data);
                    }
                    break;
                case "mission_results":
                    if (isWaiting) {
                        self.changePage(Results, data);
                    } else {
                        data.message =
                            "Waiting for everyone to finish viewing the results...";
                        self.changePage(Waiting, data);
                    }
                    break;
            }
        });

        this.server.onError = (error) =>
            this.setState({ error: error.message });
        window.nova.onConnectionChange((connection) =>
            this.setState({ connection }),
        );
    }

    componentDidMount() {
        if (window.nova) window.nova.ready();
    }

    render() {
        const reconnecting = ["reconnecting", "suspended"].includes(
            this.state.connection,
        );
        return (
            <div className="main-content text-center" id="snakeout">
                <div className="so-h1">Snakeout 🐍</div>
                <hr />
                <br />
                {reconnecting && <p role="status">Reconnecting…</p>}
                {this.state.error && <p role="alert">{this.state.error}</p>}
                {this.server ? (
                    <this.state.page
                        changePage={this.changePage}
                        server={this.server}
                        {...this.state.pageProps}
                    />
                ) : (
                    <p>
                        Play Snakeout with friends on{" "}
                        <a href="https://rocketcrab.com/transfer/snakeout">
                            Rocketcrab
                        </a>
                        .
                    </p>
                )}
                <Footer />
            </div>
        );
    }
}
