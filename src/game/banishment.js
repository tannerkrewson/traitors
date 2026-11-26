//
// Traitors Banishment
//

import knuthShuffle from "knuth-shuffle";

var shuffle = knuthShuffle.knuthShuffle;

// Banishment plays like the TV show: each day the round table banishes
// someone and learns their role; each night the traitors murder a faithful
// player, or recruit one after losing a traitor. Once four or fewer
// remain, the table may vote unanimously to end the game.
//
// Like a sabotage round, a banishment round is plain JSON, and each
// function below changes it in place.
export function Banishment(roundNumber, players) {
    for (var player of players) player.alive = true;
    var round = {
        mode: "banishment",
        roundNumber,
        players,
        traitorCount: Banishment.getNumberOfTraitors(players.length),
        day: 1,
        phase: "start",
        playersBeingWaitedOn: [],
        // the round table: who may be banished, and votes by voter id
        candidates: [],
        votes: {},
        revote: false,
        // what the table just learned
        lastVotes: [],
        banished: null,
        murdered: null,
        recruited: null,
        traitorBanishedToday: false,
        // the traitors' choices at night, by traitor id
        nightPicks: {},
        endVotes: {},
        lastEndVotes: null,
        winner: false,
        ended: false,
    };
    Banishment.assignRoles(round);
    Banishment.waitFor(round, Banishment.getLiving(round));
    return round;
}

Banishment.getNumberOfTraitors = function (numOfPlayers) {
    if (numOfPlayers <= 6) return 1;
    if (numOfPlayers <= 9) return 2;
    return 3;
};

Banishment.assignRoles = function (round) {
    var numOfTraitors = round.traitorCount;
    var shuffledPlayers = shuffle(round.players.slice());
    for (var i = 0; i < shuffledPlayers.length; i++) {
        shuffledPlayers[i].isTraitor = i < numOfTraitors;
    }
};

Banishment.getPlayer = function (round, id) {
    return round.players.find((player) => player.id === id);
};

Banishment.getLiving = function (round) {
    return round.players.filter((player) => player.alive);
};

Banishment.waitFor = function (round, players) {
    round.playersBeingWaitedOn = players.map((player) => player.id);
};

Banishment.getDisconnectedPlayers = function (round) {
    return round.players.filter(
        (player) => !player.isConnected && player.alive,
    );
};

// ran when a player hits next on a screen that waits for everyone
Banishment.done = function (round, player, phase) {
    if (round.phase !== phase) {
        throw new Error("The game has already moved on.");
    }
    var index = round.playersBeingWaitedOn.indexOf(player.id);
    if (index === -1) throw new Error("You are already done.");
    round.playersBeingWaitedOn.splice(index, 1);
    Banishment.checkIfDone(round);
};

Banishment.checkIfDone = function (round) {
    if (
        round.playersBeingWaitedOn.length > 0 ||
        Banishment.getDisconnectedPlayers(round).length > 0
    ) {
        return;
    }
    switch (round.phase) {
        case "start":
            Banishment.startDay(round);
            break;
        case "banishment":
        case "morning":
            if (Banishment.checkForWin(round)) {
                Banishment.showFinal(round);
            } else if (round.phase === "banishment") {
                Banishment.startNight(round);
            } else {
                Banishment.startDay(round);
            }
            break;
        case "final":
            round.ended = true;
            break;
    }
};

Banishment.checkForWin = function (round) {
    var living = Banishment.getLiving(round);
    var traitors = living.filter((player) => player.isTraitor).length;
    if (traitors === 0) {
        round.winner = "faithful";
    } else if (traitors >= living.length - traitors) {
        // the traitors can no longer be outvoted
        round.winner = "traitor";
    }
    return !!round.winner;
};

Banishment.showFinal = function (round) {
    round.phase = "final";
    Banishment.waitFor(round, Banishment.getLiving(round));
};

// each day begins at the round table, or with the endgame vote once
// four or fewer remain
Banishment.startDay = function (round) {
    round.banished = null;
    round.lastEndVotes = null;
    round.traitorBanishedToday = false;
    if (Banishment.getLiving(round).length <= 4) {
        round.phase = "endgame";
        round.endVotes = {};
        Banishment.waitFor(round, Banishment.getLiving(round));
    } else {
        Banishment.startRoundTable(round, Banishment.getLiving(round));
    }
};

Banishment.endgameVote = function (round, player, end) {
    if (round.phase !== "endgame" || typeof end !== "boolean") {
        throw new Error("You can't vote on that right now.");
    }
    if (!round.playersBeingWaitedOn.includes(player.id)) {
        throw new Error("You already voted.");
    }
    round.endVotes[player.id] = end;
    round.playersBeingWaitedOn.splice(
        round.playersBeingWaitedOn.indexOf(player.id),
        1,
    );
    if (round.playersBeingWaitedOn.length > 0) return;

    var votes = Object.values(round.endVotes);
    round.lastEndVotes = {
        end: votes.filter((vote) => vote).length,
        banish: votes.filter((vote) => !vote).length,
    };
    if (votes.every((vote) => vote)) {
        // a unanimous table ends the game; any traitor left wins it
        var traitorsLeft = Banishment.getLiving(round).some(
            (player) => player.isTraitor,
        );
        round.winner = traitorsLeft ? "traitor" : "faithful";
        Banishment.showFinal(round);
    } else {
        Banishment.startRoundTable(round, Banishment.getLiving(round));
    }
};

Banishment.startRoundTable = function (round, candidates) {
    round.phase = "round_table";
    round.candidates = candidates.map((player) => player.id);
    round.votes = {};
    Banishment.waitFor(round, Banishment.getLiving(round));
};

Banishment.banishVote = function (round, player, targetId) {
    if (round.phase !== "round_table") {
        throw new Error("You can't vote right now.");
    }
    if (!round.playersBeingWaitedOn.includes(player.id)) {
        throw new Error("You already voted.");
    }
    if (targetId === player.id || !round.candidates.includes(targetId)) {
        throw new Error("You can't vote for that player.");
    }
    round.votes[player.id] = targetId;
    round.playersBeingWaitedOn.splice(
        round.playersBeingWaitedOn.indexOf(player.id),
        1,
    );
    if (round.playersBeingWaitedOn.length === 0) Banishment.countVotes(round);
};

Banishment.countVotes = function (round) {
    var tally = {};
    for (var target of Object.values(round.votes)) {
        tally[target] = (tally[target] || 0) + 1;
    }
    var most = Math.max(...Object.values(tally));
    var tied = Object.keys(tally)
        .filter((id) => tally[id] === most)
        .map(Number);

    round.lastVotes = Object.entries(round.votes).map(([voter, target]) => ({
        voter: Number(voter),
        target,
    }));

    // a tie gets one revote between the tied players
    if (tied.length > 1 && !round.revote) {
        round.revote = true;
        Banishment.startRoundTable(
            round,
            tied.map((id) => Banishment.getPlayer(round, id)),
        );
        return;
    }
    round.revote = false;
    if (tied.length > 1) {
        round.banished = null;
    } else {
        var banished = Banishment.getPlayer(round, tied[0]);
        banished.alive = false;
        banished.fate = "banished";
        round.banished = banished.id;
        round.traitorBanishedToday = banished.isTraitor;
    }
    round.phase = "banishment";
    Banishment.waitFor(round, Banishment.getLiving(round));
};

Banishment.isRecruiting = function (round) {
    var living = Banishment.getLiving(round);
    return (
        round.traitorBanishedToday &&
        living.some((player) => player.isTraitor) &&
        living.filter((player) => !player.isTraitor).length > 1
    );
};

Banishment.startNight = function (round) {
    round.phase = "night";
    round.nightPicks = {};
    round.murdered = null;
    round.recruited = null;
    round.recruiting = Banishment.isRecruiting(round);
    Banishment.waitFor(
        round,
        Banishment.getLiving(round).filter((player) => player.isTraitor),
    );
};

Banishment.nightPick = function (round, player, targetId) {
    if (round.phase !== "night" || !player.isTraitor || !player.alive) {
        throw new Error("Only the traitors choose at night.");
    }
    var target = Banishment.getPlayer(round, targetId);
    if (!target || !target.alive || target.isTraitor) {
        throw new Error("Choose a faithful player.");
    }
    if (!round.playersBeingWaitedOn.includes(player.id)) {
        throw new Error("You already chose.");
    }
    round.nightPicks[player.id] = targetId;
    round.playersBeingWaitedOn.splice(
        round.playersBeingWaitedOn.indexOf(player.id),
        1,
    );
    if (round.playersBeingWaitedOn.length > 0) return;

    // the traitors' most popular choice, or a random one of a tie
    var tally = {};
    for (var id of Object.values(round.nightPicks)) {
        tally[id] = (tally[id] || 0) + 1;
    }
    var most = Math.max(...Object.values(tally));
    var tied = Object.keys(tally).filter((id) => tally[id] === most);
    var chosen = Banishment.getPlayer(
        round,
        Number(tied[Math.floor(Math.random() * tied.length)]),
    );
    if (round.recruiting) {
        chosen.isTraitor = true;
        round.recruited = chosen.id;
    } else {
        chosen.alive = false;
        chosen.fate = "murdered";
        round.murdered = chosen.id;
    }
    round.day++;
    round.phase = "morning";
    Banishment.waitFor(round, Banishment.getLiving(round));
};

Banishment.findReplacementFor = function (round, player) {
    player.isConnected = false;
};

Banishment.replacePlayer = function (round, playerToReplaceId, partyPlayer) {
    var playerToReplace = Banishment.getPlayer(round, playerToReplaceId);
    if (!playerToReplace || playerToReplace.isConnected) {
        throw new Error("That player is still here.");
    }
    playerToReplace.partyId = partyPlayer.id;
    playerToReplace.name = partyPlayer.name;
    playerToReplace.isConnected = true;
    Banishment.checkIfDone(round);
};
