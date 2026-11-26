//
// Snakeout Game
//

import { Round } from "./round.js";
import { Player } from "./player.js";

// The Nova game definition. The state is plain JSON:
//   players  everyone in the party right now, as { id, name }
//   round    the game being played, or null in the lobby
// Seats in a round have their own ids, so a newcomer can take over the
// seat of a player who left.
export const game = {
    title: "Snakeout",
    apiVersion: 1,
    minPlayers: 5,
    maxPlayers: 10,

    createInitialState(context) {
        var state = {
            players: context.players.map(({ id, name }) => ({ id, name })),
            round: null,
            currentRoundNum: 1,
        };
        // the party is already gathered, so begin right away if we can
        if (isReady(state)) startNewRound(state);
        return state;
    },

    actions: {
        startGame(state) {
            if (state.round) throw new Error("A game is already going.");
            if (!isReady(state)) {
                throw new Error("You need 5 to 10 players to start.");
            }
            startNewRound(state);
        },
        doneViewingStart: whenDone("start"),
        updateSelectedPlayers: inRound((round, player, payload) =>
            Round.updateSelectedPlayers(round, player, payload.selectedPlayers),
        ),
        submitSelectedPlayers: inRound((round, player, payload) =>
            Round.submitSelectedPlayers(round, player, payload.selectedPlayers),
        ),
        vote: inRound((round, player, payload) =>
            Round.vote(round, player, payload.vote),
        ),
        doneViewingVoteResults: whenDone("voting_results"),
        missionVote: inRound((round, player, payload) =>
            Round.missionVote(round, player, payload.vote),
        ),
        readyToViewResults: whenDone("drumroll"),
        doneViewingResults: whenDone("mission_results"),

        // sent when a newcomer selects a person to replace
        replacePlayer(state, context, payload) {
            var round = state.round;
            if (!round || getSeat(round, context.actor.id)) {
                throw new Error("You are already playing.");
            }
            Round.replacePlayer(
                round,
                payload.playerIdToReplace,
                context.actor,
            );
            endIfOver(state);
        },

        // lets the party leader give up on a game nobody can finish
        endGame(state, context) {
            if (context.actor.id !== context.leaderId) {
                throw new Error("Only the party leader can end the game.");
            }
            state.round = null;
        },
    },

    // what one player may see: their own seat, and the round without the
    // other players' secrets
    selectView(state, viewer) {
        var round = state.round;
        var you = round && getSeat(round, viewer.id);
        return {
            lobby: state.players,
            you: you ? Player.getJson(you, true) : null,
            round: round && getState(round, you),
        };
    },

    playerJoined(state, context, player) {
        state.players = state.players.filter(({ id }) => id !== player.id);
        state.players.push({ id: player.id, name: player.name });

        // a player who comes back gets their seat back
        var seat = state.round && getSeat(state.round, player.id);
        if (seat) {
            Player.replaceConnection(seat, player);
            Round.checkIfDone(state.round);
            endIfOver(state);
        }
    },

    playerLeft(state, context, player) {
        state.players = state.players.filter(({ id }) => id !== player.id);

        var seat = state.round && getSeat(state.round, player.id);
        if (seat) Round.findReplacementFor(state.round, seat);
    },
};

function isReady(state) {
    //the game must have [5, 10] players
    return state.players.length >= 5 && state.players.length <= 10;
}

function startNewRound(state) {
    var players = state.players.map((player, i) =>
        Player(player.name, player.id, i + 1),
    );
    state.round = Round(state.currentRoundNum++, players);
    Round.startRound(state.round);
}

function getSeat(round, partyId) {
    return round.players.find((player) => player.partyId === partyId);
}

// ran when the round ends: back to the lobby
function endIfOver(state) {
    if (state.round && state.round.ended) state.round = null;
}

function inRound(handler) {
    return function (state, context, payload) {
        var round = state.round;
        var player = round && getSeat(round, context.actor.id);
        if (!player) throw new Error("You are not in this game.");
        handler(round, player, payload || {});
        endIfOver(state);
    };
}

function whenDone(phase) {
    return inRound((round, player) => Round.done(round, player, phase));
}

function getState(round, you) {
    var currentMission = Round.getCurrentMission(round);
    var showAllRoles = !!round.winner || !!(you && you.isSnake);

    var players = round.players.map((player) =>
        Player.getJson(player, showAllRoles || player === you),
    );
    var byId = (ids) =>
        ids.map((id) => players.find((player) => player.id === id));

    var missions = round.missions.map((mission) => {
        var isCurrent = mission === currentMission;
        return {
            number: mission.number,
            playersNeeded: mission.playersNeeded,
            status: mission.status,
            inProgress: !!mission.inProgress,
            potentialPlayersOnMission: byId(mission.potentialPlayersOnMission),
            playersOnMission: byId(mission.playersOnMission),
            // votes on a team are public once everyone has voted
            votes: isCurrent && round.phase === "voting" ? [] : mission.votes,
            // mission votes are anonymous, and secret until the results
            missionVotes:
                isCurrent && ["mission", "drumroll"].includes(round.phase)
                    ? []
                    : mission.missionVotes
                          .map(({ vote }) => ({ vote }))
                          .sort((a, b) => b.vote - a.vote),
        };
    });

    return {
        captainsSelectedPlayers: byId(round.captainsSelectedPlayers),
        currentMission: missions[round.missionNumber - 1],
        disconnectedList: players.filter((player) => !player.isConnected),
        missions,
        phase: round.phase,
        players,
        potentialPlayersOnMission: byId(
            currentMission.potentialPlayersOnMission,
        ),
        rejectedTeams: round.rejectedTeams,
        snakeCount: round.snakeCount,
        waitingList: byId(round.playersBeingWaitedOn),
        winner: round.winner,
    };
}
