//
// Traitors Game
//

import { Round } from "./round.js";
import { Banishment } from "./banishment.js";
import { Player } from "./player.js";
import { stepBots } from "./bots.js";

// The Nova game definition, for one mode. Sabotage and Banishment are
// separate games on Rocketcrab, built from this same code. The state is
// plain JSON:
//   players  everyone in the party right now, as { id, name }
//   mode     "sabotage" (missions) or "banishment" (the round table)
//   round    the game being played, or null in the lobby
// Seats in a round have their own ids, so a newcomer can take over the
// seat of a player who left.
export const game = {
    title: "Traitors: Sabotage",
    apiVersion: 1,
    // Rocketcrab suggests a full table; 3 or 4 can still start, with bots
    minPlayers: 5,
    maxPlayers: 10,
    // only bots use the tick, and only while one of them is about to move
    tickRate: 2,

    createInitialState(context, mode = "sabotage") {
        var state = {
            players: context.players.map(({ id, name }) => ({ id, name })),
            mode,
            round: null,
            currentRoundNum: 1,
        };
        // the party is already gathered, so begin right away if we can.
        // Smaller parties see what playing with bots means first.
        if (isReady(state) && state.players.length >= FULL_TABLE) {
            startNewRound(state);
        }
        return state;
    },

    actions: {
        startGame(state) {
            if (state.round) throw new Error("A game is already going.");
            if (!isReady(state)) {
                throw new Error("You need 3 to 10 players to start.");
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

        // Banishment
        doneViewing: inRound(
            (round, player, payload) =>
                Banishment.done(round, player, payload.phase),
            "banishment",
        ),
        banishVote: inRound(
            (round, player, payload) =>
                Banishment.banishVote(round, player, payload.target),
            "banishment",
        ),
        nightPick: inRound(
            (round, player, payload) =>
                Banishment.nightPick(round, player, payload.target),
            "banishment",
        ),
        endgameVote: inRound(
            (round, player, payload) =>
                Banishment.endgameVote(round, player, payload.end),
            "banishment",
        ),

        // sent when a newcomer selects a person to replace
        replacePlayer(state, context, payload) {
            var round = state.round;
            if (!round || getSeat(round, context.actor.id)) {
                throw new Error("You are already playing.");
            }
            rules(round).replacePlayer(
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

    tick(state, context) {
        if (!state.round) return;
        stepBots(state.round, context.dt);
        endIfOver(state);
    },

    // what one player may see: their own seat, and the round without the
    // other players' secrets
    selectView(state, viewer) {
        var round = state.round;
        var you = round && getSeat(round, viewer.id);
        var view =
            round && round.mode === "banishment"
                ? getBanishmentState
                : getState;
        return {
            lobby: state.players,
            mode: state.mode,
            you: you ? getYou(you) : null,
            round: round && view(round, you),
        };
    },

    playerJoined(state, context, player) {
        state.players = state.players.filter(({ id }) => id !== player.id);
        state.players.push({ id: player.id, name: player.name });

        // a player who comes back gets their seat back
        var seat = state.round && getSeat(state.round, player.id);
        if (seat) {
            Player.replaceConnection(seat, player);
            rules(state.round).checkIfDone(state.round);
            endIfOver(state);
        }
    },

    playerLeft(state, context, player) {
        state.players = state.players.filter(({ id }) => id !== player.id);

        var seat = state.round && getSeat(state.round, player.id);
        if (seat) rules(state.round).findReplacementFor(state.round, seat);
    },
};

// Banishment is a separate game on Rocketcrab, built from the same code
export const banishmentGame = {
    ...game,
    title: "Traitors: Banishment",
    createInitialState: (context) =>
        game.createInitialState(context, "banishment"),
};

export function createGame(mode) {
    return mode === "banishment" ? banishmentGame : game;
}

// the rules are written for 5 to 10 players; bots fill the table up to 5
var FULL_TABLE = 5;
var BOT_NAMES = ["Maya", "Theo", "Priya", "Sam", "Jules"];

function isReady(state) {
    //the game must have [3, 10] players
    return state.players.length >= 3 && state.players.length <= 10;
}

function startNewRound(state) {
    var players = state.players.map((player, i) =>
        Player(player.name, player.id, i + 1),
    );
    var names = players.map((player) => player.name);
    var botNames = BOT_NAMES.filter((name) => !names.includes(name));
    while (players.length < FULL_TABLE) {
        var bot = Player(botNames.shift(), null, players.length + 1);
        bot.isBot = true;
        players.push(bot);
    }
    if (state.mode === "banishment") {
        state.round = Banishment(state.currentRoundNum++, players);
    } else {
        state.round = Round(state.currentRoundNum++, players);
        Round.startRound(state.round);
    }
}

// the functions that run the round's mode
function rules(round) {
    return round.mode === "banishment" ? Banishment : Round;
}

// your own seat, with your role and, in Banishment, whether you're still in
function getYou(you) {
    var json = Player.getJson(you, true);
    if (you.alive !== undefined) {
        json.alive = you.alive;
        json.fate = you.fate;
    }
    return json;
}

function getSeat(round, partyId) {
    return round.players.find((player) => player.partyId === partyId);
}

// ran when the round ends: back to the lobby
function endIfOver(state) {
    if (state.round && state.round.ended) state.round = null;
}

function inRound(handler, mode = "sabotage") {
    return function (state, context, payload) {
        var round = state.round;
        var player = round && getSeat(round, context.actor.id);
        if (!player) throw new Error("You are not in this game.");
        if ((round.mode || "sabotage") !== mode) {
            throw new Error("That's not part of this game.");
        }
        handler(round, player, payload || {});
        endIfOver(state);
    };
}

function whenDone(phase) {
    return inRound((round, player) => Round.done(round, player, phase));
}

function getState(round, you) {
    var currentMission = Round.getCurrentMission(round);
    var showAllRoles = !!round.winner || !!(you && you.isTraitor);

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
        traitorCount: round.traitorCount,
        waitingList: byId(round.playersBeingWaitedOn),
        winner: round.winner,
    };
}

function getBanishmentState(round, you) {
    var dead = !!(you && !you.alive);
    // traitors know each other; the eliminated watch with everything shown
    var seeTraitors = !!round.winner || dead || !!(you && you.isTraitor);

    var players = round.players.map((player) => {
        var json = Player.getJson(player, seeTraitors || player === you);
        json.alive = player.alive;
        // a banished or murdered player's role is public
        if (!player.alive) {
            json.fate = player.fate;
            json.isTraitor = player.isTraitor;
        }
        return json;
    });
    var byId = (id) => players.find((player) => player.id === id) || null;
    var revealVotes =
        round.phase === "banishment" ||
        (round.phase === "round_table" && round.revote);

    return {
        mode: "banishment",
        phase: round.phase,
        day: round.day,
        players,
        traitorCount: round.traitorCount,
        candidates: round.candidates.map(byId),
        waitingList: round.playersBeingWaitedOn.map(byId),
        disconnectedList: players.filter(
            (player) => !player.isConnected && player.alive,
        ),
        revote: round.revote,
        lastVotes: revealVotes
            ? round.lastVotes.map(({ voter, target }) => ({
                  voter: byId(voter),
                  target: byId(target),
              }))
            : [],
        myVote:
            you && round.phase === "round_table"
                ? byId(round.votes[you.id])
                : null,
        banished: byId(round.banished),
        murdered: byId(round.murdered),
        // only the traitors learn who joined them
        recruited: seeTraitors ? byId(round.recruited) : null,
        recruiting: seeTraitors && !!round.recruiting,
        nightPicks: seeTraitors
            ? Object.entries(round.nightPicks).map(([traitor, target]) => ({
                  traitor: byId(Number(traitor)),
                  target: byId(target),
              }))
            : [],
        lastEndVotes: round.lastEndVotes,
        winner: round.winner,
    };
}
