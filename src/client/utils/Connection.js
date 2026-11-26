// Sends this player's moves to the game through Nova. The method names are
// the events the old Socket.IO server listened for.
function Connection(onStateUpdate, nova = window.nova) {
    this.nova = nova;
    this.onError = function () {};

    nova.state.onChange(onStateUpdate);
    nova.onStart(function () {
        var state = nova.state.get();
        if (state) onStateUpdate(state);
    });
}

const ids = (players) => players.map((player) => player.id);

Connection.prototype.startGame = function () {
    return this.send("startGame");
};

Connection.prototype.vote = function (vote) {
    return this.send("vote", {
        vote,
    });
};

Connection.prototype.missionVote = function (vote) {
    return this.send("missionVote", {
        vote,
    });
};

Connection.prototype.updateSelectedPlayers = function (selectedPlayers) {
    return this.send("updateSelectedPlayers", {
        selectedPlayers: ids(selectedPlayers),
    });
};

Connection.prototype.submitSelectedPlayers = function (selectedPlayers) {
    return this.send("submitSelectedPlayers", {
        selectedPlayers: ids(selectedPlayers),
    });
};

Connection.prototype.doneViewingStart = function () {
    return this.send("doneViewingStart");
};

Connection.prototype.doneViewingResults = function () {
    return this.send("doneViewingResults");
};

Connection.prototype.doneViewingVoteResults = function () {
    return this.send("doneViewingVoteResults");
};

Connection.prototype.readyToViewResults = function () {
    return this.send("readyToViewResults");
};

Connection.prototype.tryReplace = function (data) {
    return this.send("replacePlayer", data);
};

Connection.prototype.doneViewing = function (phase) {
    return this.send("doneViewing", { phase });
};

Connection.prototype.banishVote = function (player) {
    return this.send("banishVote", { target: player.id });
};

Connection.prototype.nightPick = function (player) {
    return this.send("nightPick", { target: player.id });
};

Connection.prototype.endgameVote = function (end) {
    return this.send("endgameVote", { end });
};

Connection.prototype.endGame = function () {
    return this.send("endGame");
};

Connection.prototype.send = function (type, payload = {}) {
    return this.nova
        .dispatch({ type, payload })
        .catch((error) => this.onError(error));
};

export default Connection;
