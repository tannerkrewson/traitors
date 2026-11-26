// Plausible players for small games and the solo demo. A bot looks at the
// whole state and returns the moves it wants to make right now. The rules
// still decide whether a move is allowed.

import { Round } from "./round.js";
import { Banishment } from "./banishment.js";

const seatOf = (round, id) => round.players.find((player) => player.id === id);

// how many sabotaged missions each seat was on
export function suspicion(round) {
    const score = {};
    for (const mission of round.missions) {
        if (mission.status !== "traitor") continue;
        for (const id of mission.playersOnMission) {
            score[id] = (score[id] || 0) + 1;
        }
    }
    return score;
}

function shuffled(list, random) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

export function pickTeam(round, me, random = Math.random) {
    const size = round.missions[round.missionNumber - 1].playersNeeded;
    const score = suspicion(round);
    const others = shuffled(
        round.players.filter((player) => player !== me),
        random,
    );
    // a faithful captain avoids anyone who was on a sabotaged mission; a
    // traitor captain brings only faithful players, to look the same
    const preferred = me.isTraitor
        ? others.filter((player) => !player.isTraitor)
        : others.sort((a, b) => (score[a.id] || 0) - (score[b.id] || 0));
    const team = [me, ...preferred, ...others];
    return [...new Set(team)].slice(0, size).map((player) => player.id);
}

function approves(round, me, mission, random) {
    const team = mission.potentialPlayersOnMission.map((id) =>
        seatOf(round, id),
    );
    if (me.isTraitor) {
        // one more rejection wins the game for the traitors
        if (round.rejectedTeams === 4) return false;
        return team.some((player) => player.isTraitor) || random() < 0.3;
    }
    // don't hand the traitors the game
    if (round.rejectedTeams >= 3) return true;
    const score = suspicion(round);
    if (team.some((player) => score[player.id])) return random() < 0.2;
    return team.includes(me) || random() < 0.75;
}

function passes(round, me, mission, random) {
    if (!me.isTraitor) return true;
    const traitors = mission.playersOnMission
        .map((id) => seatOf(round, id))
        .filter((player) => player.isTraitor);
    const needed = mission.number === 4 && round.players.length >= 7 ? 2 : 1;
    // only as many traitors as it takes sabotage, so the count gives less away
    if (!traitors.slice(0, needed).includes(me)) return true;
    if (traitors.length < needed) return true;
    // sometimes a traitor lies low early on
    return random() < (mission.number === 1 ? 0.45 : 0.15);
}

export function botMoves(state, partyId, random = Math.random) {
    const round = state.round;
    const me = round && round.players.find((p) => p.partyId === partyId);
    return me ? seatMoves(round, me, random) : [];
}

export function seatMoves(round, me, random = Math.random) {
    if (round.mode === "banishment") return banishmentMoves(round, me, random);
    const waiting = round.playersBeingWaitedOn.includes(me.id);
    const mission = round.missions[round.missionNumber - 1];
    switch (round.phase) {
        case "start":
            return waiting ? [{ type: "doneViewingStart" }] : [];
        case "selection":
            return me.isCaptain
                ? [
                      {
                          type: "submitSelectedPlayers",
                          payload: {
                              selectedPlayers: pickTeam(round, me, random),
                          },
                      },
                  ]
                : [];
        case "voting":
            return waiting
                ? [
                      {
                          type: "vote",
                          payload: {
                              vote: approves(round, me, mission, random),
                          },
                      },
                  ]
                : [];
        case "voting_results":
            return waiting ? [{ type: "doneViewingVoteResults" }] : [];
        case "mission":
            return waiting
                ? [
                      {
                          type: "missionVote",
                          payload: { vote: passes(round, me, mission, random) },
                      },
                  ]
                : [];
        case "drumroll":
            return waiting ? [{ type: "readyToViewResults" }] : [];
        case "mission_results":
            return waiting ? [{ type: "doneViewingResults" }] : [];
    }
    return [];
}

// how long a bot takes in each phase, in seconds: [least, most]
const PACE = {
    start: [1.5, 3],
    selection: [1, 1.5],
    voting: [1, 2.5],
    voting_results: [1, 2],
    mission: [1, 2],
    drumroll: [0.5, 1.5],
    mission_results: [1.5, 3],
    endgame: [1.5, 3],
    round_table: [2, 4],
    banishment: [1.5, 3],
    night: [1.5, 3],
    morning: [1.5, 3],
    final: [1.5, 3],
};

// Run from the game's tick: the first bot with something to do waits a
// moment, as a person would, then makes its move. The state only changes
// while a bot is waiting or moving, so idle ticks cost nothing.
export function stepBots(round, dt, random = Math.random) {
    let bot;
    let move;
    for (const seat of round.players) {
        if (!seat.isBot) continue;
        [move] = seatMoves(round, seat, random);
        if (move) {
            bot = seat;
            break;
        }
    }
    if (!move) {
        if (round.botTimer != null) round.botTimer = null;
        return;
    }
    if (round.botTimer == null) {
        const [least, most] = PACE[round.phase];
        round.botTimer =
            Math.round((least + random() * (most - least)) * 10) / 10;
        return;
    }
    round.botTimer = Math.round((round.botTimer - dt) * 10) / 10;
    if (round.botTimer > 0) return;
    round.botTimer = null;
    makeMove(round, bot, move);
}

function makeMove(round, bot, move) {
    const vote = move.payload && move.payload.vote;
    switch (move.type) {
        case "submitSelectedPlayers": {
            // pick one player at a time, so everyone sees it happen
            const team = round.botTeam || move.payload.selectedPlayers;
            const picked = round.captainsSelectedPlayers.length;
            if (picked < team.length) {
                round.botTeam = team;
                Round.updateSelectedPlayers(
                    round,
                    bot,
                    team.slice(0, picked + 1),
                );
            } else {
                round.botTeam = null;
                Round.submitSelectedPlayers(round, bot, team);
            }
            break;
        }
        case "vote":
            Round.vote(round, bot, vote);
            break;
        case "missionVote":
            Round.missionVote(round, bot, vote);
            break;
        case "doneViewing":
            Banishment.done(round, bot, move.payload.phase);
            break;
        case "banishVote":
            Banishment.banishVote(round, bot, move.payload.target);
            break;
        case "nightPick":
            Banishment.nightPick(round, bot, move.payload.target);
            break;
        case "endgameVote":
            Banishment.endgameVote(round, bot, move.payload.end);
            break;
        default:
            Round.done(round, bot, round.phase);
    }
}

// Banishment bots. The faithful distrust whoever voted out the last
// faithful player; traitors vote and murder among the faithful, and back
// each other up at night.
function banishmentMoves(round, me, random) {
    if (!me.alive || !round.playersBeingWaitedOn.includes(me.id)) return [];
    const living = round.players.filter((player) => player.alive);
    const pick = (list) => list[Math.floor(random() * list.length)];
    const lastBanished = round.players.find((p) => p.id === round.banished);
    const suspects = new Set(
        lastBanished && !lastBanished.isTraitor
            ? round.lastVotes
                  .filter((vote) => vote.target === lastBanished.id)
                  .map((vote) => vote.voter)
            : [],
    );

    switch (round.phase) {
        case "endgame":
            return [
                {
                    type: "endgameVote",
                    payload: { end: me.isTraitor || random() < 0.25 },
                },
            ];
        case "round_table": {
            const options = round.candidates
                .filter((id) => id !== me.id)
                .map((id) => round.players.find((p) => p.id === id));
            let choices = me.isTraitor
                ? options.filter((player) => !player.isTraitor)
                : options.filter((player) => suspects.has(player.id));
            if (!choices.length) choices = options;
            return [
                { type: "banishVote", payload: { target: pick(choices).id } },
            ];
        }
        case "night": {
            // back up a fellow traitor's choice, if there is one
            const chosen = Object.values(round.nightPicks);
            const faithful = living.filter((player) => !player.isTraitor);
            const target = chosen.length ? chosen[0] : pick(faithful).id;
            return [{ type: "nightPick", payload: { target } }];
        }
        default:
            return [{ type: "doneViewing", payload: { phase: round.phase } }];
    }
}
