//
// Snakeout Round
//

import { Mission } from "./mission.js";

import knuthShuffle from "knuth-shuffle";
import getNumberOfPlayersOnMission from "./getNumberOfPlayersOnMission.js";

var shuffle = knuthShuffle.knuthShuffle;

// A round is plain JSON so that Nova can keep it in the game state. Each
// function below takes the round and changes it in place.
export function Round(roundNumber, players) {
    var round = {
        roundNumber,
        players,
        playersBeingWaitedOn: [],
        missionNumber: 0,
        missions: [],
        captainsSelectedPlayers: [],
        snakeCount: Round.getNumberOfSnakes(players.length),
        rejectedTeams: 0,
        winner: false,
        // the mission's result, kept secret until everyone is ready for it
        pendingMissionResult: null,
        ended: false,
        phase: "lobby",
    };
    /* Phase List:
		lobby
		start
		selection
		voting
		voting_results
		mission
		drumroll
		mission_results
	*/

    //add the five missions
    //i is the mission number
    for (var i = 1; i <= 5; i++) {
        var numPlayersForMission = getNumberOfPlayersOnMission(
            players.length,
            i,
        );
        var newMission = Mission(i, numPlayersForMission, players.length);
        round.missions.push(newMission);
    }

    return round;
}

Round.getCurrentMission = function (round) {
    return round.missions[round.missionNumber - 1];
};

Round.changePhase = function (round, phase) {
    round.phase = phase;
};

Round.getPlayer = function (round, id) {
    return round.players.find((player) => player.id === id);
};

Round.removePlayerFromWaitingList = function (round, player) {
    // see if this player is in the waiting list
    var indexOfPlayer = round.playersBeingWaitedOn.indexOf(player.id);

    if (indexOfPlayer > -1) {
        //remove the player from the array
        round.playersBeingWaitedOn.splice(indexOfPlayer, 1);
        return true;
    }
    return false;
};

Round.waitFor = function (round, playersToWaitOn) {
    round.playersBeingWaitedOn = playersToWaitOn.map((player) => player.id);
};

// ran when a player hits next on a screen that waits for everyone
Round.done = function (round, player, phase) {
    if (round.phase !== phase) {
        throw new Error("The game has already moved on.");
    }
    if (!Round.removePlayerFromWaitingList(round, player)) {
        throw new Error("You are already done.");
    }
    Round.checkIfDone(round);
};

//if we aren't waiting on any more players, continue with whatever
// and no players are disconnected
Round.checkIfDone = function (round) {
    if (
        round.playersBeingWaitedOn.length > 0 ||
        Round.getDisconnectedPlayers(round).length > 0
    ) {
        return;
    }
    switch (round.phase) {
        case "start":
            //ran once everyone is ready to start
            Round.startSelectionPhase(round);
            break;
        case "voting_results":
            Round.doneViewingVoteResults(round);
            break;
        case "drumroll":
            // ran once everyone is ready to view the mission results
            Round.processResultsOfMission(round, round.pendingMissionResult);
            Round.sendMissionResults(round);
            break;
        case "mission_results":
            Round.doneViewingResults(round);
            break;
    }
};

Round.checkForWin = function (round) {
    var snakeWins = 0;
    var loyalistWins = 0;
    for (var i = 0; i < round.missions.length; i++) {
        var thisMission = round.missions[i];
        if (thisMission.status === "snake") {
            snakeWins++;
        } else if (thisMission.status === "loyalist") {
            loyalistWins++;
        }
    }
    if (snakeWins === 3) {
        round.winner = "snake";
    } else if (loyalistWins === 3) {
        round.winner = "loyalist";
    }
    return !!round.winner;
};

Round.getDisconnectedPlayers = function (round) {
    return round.players.filter((player) => !player.isConnected);
};

Round.findReplacementFor = function (round, player) {
    player.isConnected = false;
};

Round.replacePlayer = function (round, playerToReplaceId, partyPlayer) {
    var playerToReplace = Round.getPlayer(round, playerToReplaceId);
    if (!playerToReplace || playerToReplace.isConnected) {
        throw new Error("That player is still here.");
    }
    playerToReplace.partyId = partyPlayer.id;
    playerToReplace.name = partyPlayer.name;
    playerToReplace.isConnected = true;

    // if there are not players being waited on, and the player we just replaced
    // was the last person on the disconnectedPlayers list, continue
    Round.checkIfDone(round);
};

Round.getNumberOfSnakes = function (numOfPlayers) {
    if (numOfPlayers === 5 || numOfPlayers === 6) {
        return 2;
    } else if (numOfPlayers >= 7 && numOfPlayers <= 9) {
        return 3;
    } else if (numOfPlayers === 10) {
        return 4;
    } else {
        //this should not be reached
        throw new Error("Bad number of players: " + numOfPlayers);
    }
};

Round.assignRoles = function (round) {
    var numOfSnakes = round.snakeCount;

    //shuffle a copy of the players so that the same people are not
    //	snakes everytime, and the player list does not give them away
    var shuffledPlayers = shuffle(round.players.slice());

    for (var i = 0; i < shuffledPlayers.length; i++) {
        if (numOfSnakes > 0) {
            shuffledPlayers[i].isSnake = true;
            numOfSnakes--;
        } else {
            shuffledPlayers[i].isSnake = false;
        }
    }
};

Round.assignNewCaptain = function (round) {
    //get rid of the old captain with good old brute force
    for (var i = 0; i < round.players.length; i++) {
        round.players[i].isCaptain = false;
    }

    //check if everyone has been captain
    var playerCount = round.players.length;
    var hasBeenCaptainCount = 0;
    for (var i = 0; i < round.players.length; i++) {
        if (round.players[i].hasBeenCaptain) {
            hasBeenCaptainCount++;
        } else {
            break;
        }
    }

    //if everyone has been captain
    if (playerCount === hasBeenCaptainCount) {
        //remove the hasBeenCaptain so the game can pick
        //	a new captain
        for (var i = 0; i < round.players.length; i++) {
            round.players[i].hasBeenCaptain = false;
        }
    }

    //select a random player who has not yet been captain
    //	to be captain for this mission
    var indexOfCaptain;
    do {
        indexOfCaptain = Math.floor(Math.random() * round.players.length);
    } while (round.players[indexOfCaptain].hasBeenCaptain);

    round.players[indexOfCaptain].isCaptain = true;
    round.players[indexOfCaptain].hasBeenCaptain = true;
};

Round.getCaptain = function (round) {
    return round.players.find((player) => player.isCaptain);
};

Round.startRound = function (round) {
    Round.assignRoles(round);
    Round.assignNewCaptain(round);
    Round.prepNextMission(round);
    Round.showStartPage(round);
};

Round.prepNextMission = function (round) {
    round.missionNumber++;

    //remove in progress from last mission, if there was a last mission
    if (round.missionNumber > 1) {
        var lastMission = round.missions[round.missionNumber - 2];
        lastMission.inProgress = false;
    }

    //set current mission in progress
    //subtract one because round.missions indexes start at 0
    var currentMission = Round.getCurrentMission(round);
    currentMission.inProgress = true;
};

Round.showStartPage = function (round) {
    Round.changePhase(round, "start");

    // wait for everyone to view their role
    Round.waitFor(round, round.players);
};

// the first phase of each mission
Round.startSelectionPhase = function (round) {
    Round.changePhase(round, "selection");
    round.captainsSelectedPlayers = [];

    // this list is only going to contain one player, but I do it because
    // waitFor requires an array of players
    var captainList = [Round.getCaptain(round)];
    Round.waitFor(round, captainList);
};

// this is for the live updating check list showed on everyone elses screens
Round.updateSelectedPlayers = function (round, player, selectedPlayers) {
    Round.checkSelection(round, player, selectedPlayers);
    round.captainsSelectedPlayers = selectedPlayers;
};

// ran once the captain has selected players
Round.submitSelectedPlayers = function (round, player, selectedPlayers) {
    Round.checkSelection(round, player, selectedPlayers);
    var numPlayersToSelect = Round.getCurrentMission(round).playersNeeded;
    if (selectedPlayers.length !== numPlayersToSelect) {
        throw new Error("Select " + numPlayersToSelect + " players.");
    }
    Round.startVotingPhase(round, selectedPlayers);
};

Round.checkSelection = function (round, player, selectedPlayers) {
    if (round.phase !== "selection" || !player.isCaptain) {
        throw new Error("Only the captain can select players right now.");
    }
    var numPlayersToSelect = Round.getCurrentMission(round).playersNeeded;
    if (
        !Array.isArray(selectedPlayers) ||
        selectedPlayers.length > numPlayersToSelect ||
        new Set(selectedPlayers).size !== selectedPlayers.length ||
        !selectedPlayers.every((id) => Round.getPlayer(round, id))
    ) {
        throw new Error("That is not a valid team.");
    }
};

Round.startVotingPhase = function (round, selectedPlayers) {
    var thisMission = Round.getCurrentMission(round);
    thisMission.potentialPlayersOnMission = selectedPlayers;

    Mission.startVote(thisMission);

    Round.changePhase(round, "voting");
    Round.waitFor(round, round.players);
};

// ran when a single player's vote is submitted
Round.vote = function (round, player, vote) {
    if (round.phase !== "voting" || typeof vote !== "boolean") {
        throw new Error("You can't vote right now.");
    }
    if (!Round.removePlayerFromWaitingList(round, player)) {
        throw new Error("You already voted.");
    }
    var thisMission = Round.getCurrentMission(round);
    Mission.addVote(thisMission, player.id, vote);

    // runs the processResultsOfVote function once everyone has voted
    if (Mission.allPlayersVoted(thisMission)) {
        Round.processResultsOfVote(
            round,
            Mission.wasVoteSuccessful(thisMission),
        );
    }
};

Round.processResultsOfVote = function (round, wasVoteSuccessful) {
    if (wasVoteSuccessful) {
        round.rejectedTeams = 0;
    } else {
        // the snakes win if the team votes fail 5 times in a row.
        round.rejectedTeams++;
        if (round.rejectedTeams === 5) {
            round.winner = "snake";
        }
    }

    // wait for everyone to be done viewing the results that
    // we are about to send
    Round.changePhase(round, "voting_results");
    Round.waitFor(round, round.players);
};

// ran once, once everyone is done viewing the vote results
Round.doneViewingVoteResults = function (round) {
    var thisMission = Round.getCurrentMission(round);
    if (round.winner) {
        // game over!
        round.ended = true;
    } else if (round.rejectedTeams === 0) {
        Mission.putSelectedPlayersOnTheMission(thisMission);
        Round.startMissionPhase(round);
    } else {
        // since the vote failed, we'll try the vote again with a new captain
        // to select players.
        Round.assignNewCaptain(round);
        Round.startSelectionPhase(round);
    }
};

Round.startMissionPhase = function (round) {
    var thisMission = Round.getCurrentMission(round);

    Mission.startMission(thisMission);

    // wait for the players on the mission to vote
    Round.waitFor(
        round,
        thisMission.playersOnMission.map((id) => Round.getPlayer(round, id)),
    );

    Round.changePhase(round, "mission");
};

//ran when a single player on the mission is done
Round.missionVote = function (round, player, vote) {
    if (round.phase !== "mission" || typeof vote !== "boolean") {
        throw new Error("You can't vote on the mission right now.");
    }
    if (!Round.removePlayerFromWaitingList(round, player)) {
        throw new Error("You are not waiting to vote on this mission.");
    }
    var thisMission = Round.getCurrentMission(round);
    Mission.addMissionVote(thisMission, player.id, vote);

    // process the results of the mission once everyone votes
    if (Mission.allPlayersMissionVoted(thisMission)) {
        Round.startDrumroll(round, Mission.wasMissionSuccessful(thisMission));
    }
};

Round.processResultsOfMission = function (round, wasMissionSuccessful) {
    if (wasMissionSuccessful) {
        // loyalists win this mission
        Round.getCurrentMission(round).status = "loyalist";
    } else {
        // snakes win this mission
        Round.getCurrentMission(round).status = "snake";
    }
    round.pendingMissionResult = null;
};

// "drumroll" is a phase that occurs after a mission has conculuded
// in which the game waits for each player to be ready to view the
// results
Round.startDrumroll = function (round, wasMissionSuccessful) {
    round.pendingMissionResult = wasMissionSuccessful;

    // wait for everyone to be ready to view the mission results
    Round.changePhase(round, "drumroll");
    Round.waitFor(round, round.players);
};

Round.sendMissionResults = function (round) {
    Round.checkForWin(round);

    // wait for everyone to be done viewing the results that
    // we are about to send
    Round.changePhase(round, "mission_results");
    Round.waitFor(round, round.players);
};

// ran once everyone is done viewing the mission results
Round.doneViewingResults = function (round) {
    if (!round.winner) {
        Round.assignNewCaptain(round);
        Round.prepNextMission(round);
        Round.startSelectionPhase(round);
    } else {
        // game over!
        round.ended = true;
    }
};
