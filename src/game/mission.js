//
// Snakeout Mission
//

export function Mission(number, playersNeeded, numberOfPlayersInTheGame) {
    return {
        number,
        playersNeeded,
        status: false,
        numberOfPlayersInTheGame,

        potentialPlayersOnMission: [],
        playersOnMission: [],
        votes: [],
        missionVotes: [],
    };
}

Mission.startVote = function (mission) {
    mission.votes = [];
};

// vote: true=approve; false=reject;
Mission.addVote = function (mission, playerId, vote) {
    mission.votes.push(Vote(playerId, vote));
};

Mission.allPlayersVoted = function (mission) {
    return mission.numberOfPlayersInTheGame === mission.votes.length;
};

Mission.wasVoteSuccessful = function (mission) {
    //check if the vote was successful
    var wasVoteSuccessful;
    var approveCount = 0;
    var rejectCount = 0;
    for (var i = 0; i < mission.votes.length; i++) {
        if (mission.votes[i].vote) {
            approveCount++;
        } else {
            rejectCount++;
        }
    }

    // if there is a tie, the vote fails
    if (approveCount > rejectCount) {
        wasVoteSuccessful = true;
    } else {
        wasVoteSuccessful = false;
    }

    return wasVoteSuccessful;
};

Mission.putSelectedPlayersOnTheMission = function (mission) {
    // takes the potentialPlayersOnMission and makes them the
    // actual playersOnMission
    mission.playersOnMission = mission.potentialPlayersOnMission;
    mission.potentialPlayersOnMission = [];
};

Mission.startMission = function (mission) {
    mission.missionVotes = [];
};

// vote: true=approve; false=reject;
Mission.addMissionVote = function (mission, playerId, vote) {
    mission.missionVotes.push(Vote(playerId, vote));
};

Mission.allPlayersMissionVoted = function (mission) {
    return mission.playersOnMission.length === mission.missionVotes.length;
};

Mission.wasMissionSuccessful = function (mission) {
    //check if the vote was successful
    var wasVoteSuccessful;
    var approveCount = 0;
    var rejectCount = 0;
    for (var i = 0; i < mission.missionVotes.length; i++) {
        if (mission.missionVotes[i].vote) {
            approveCount++;
        } else {
            rejectCount++;
        }
    }

    if (rejectCount === 0) {
        wasVoteSuccessful = true;
    } else if (
        mission.number === 4 &&
        mission.numberOfPlayersInTheGame >= 7 &&
        rejectCount === 1
    ) {
        // if it is the 4th mission and the game has 7 or more players,
        // the mission needs two fail votes to fail
        wasVoteSuccessful = true;
    } else {
        wasVoteSuccessful = false;
    }

    return wasVoteSuccessful;
};

function Vote(playerId, vote) {
    return { playerId, vote };
}
