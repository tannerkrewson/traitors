// Plausible players for the solo demo. A bot looks at the whole state (the
// demo runs entirely in one browser) and returns the moves it wants to make
// right now. The rules still decide whether a move is allowed.

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
    if (!me) return [];
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
