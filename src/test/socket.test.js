import http from "node:http";
import { afterAll, beforeAll } from "vitest";
import { io as connect } from "socket.io-client";
import app from "../server/app.js";
import { scenarios } from "./scenarios.js";

// Drives the Express and Socket.IO server the way the React client did.

const EVENTS = {
    startGame: () => ["startGame", {}],
    doneViewingStart: () => ["doneViewingStart", {}],
    updateSelectedPlayers: (selectedPlayers) => [
        "updateSelectedPlayers",
        { selectedPlayers },
    ],
    submitSelectedPlayers: (selectedPlayers) => [
        "submitSelectedPlayers",
        { selectedPlayers },
    ],
    vote: (vote) => ["selectionVote", { vote }],
    missionVote: (vote) => ["missionVote", { vote }],
    doneViewingVoteResults: () => ["doneViewingVoteResults", {}],
    readyToViewResults: () => ["readyToViewResults", {}],
    doneViewingResults: () => ["doneViewingResults", {}],
};

// the old server used the Snakeout names
const RENAMED_KEYS = { isSnake: "isTraitor", snakeCount: "traitorCount" };
const RENAMED_VALUES = { snake: "traitor", loyalist: "faithful" };
const rename = (data) =>
    JSON.parse(JSON.stringify(data), function (key, value) {
        if (key in RENAMED_KEYS) {
            this[RENAMED_KEYS[key]] = value;
            return undefined;
        }
        return key === "status" ? (RENAMED_VALUES[value] ?? value) : value;
    });

let server;
let url;
beforeAll(async () => {
    server = http.createServer(app);
    app.io.attach(server);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
    app.io.close();
    await new Promise((resolve) => server.close(resolve));
});

const once = (socket, event) =>
    new Promise((resolve) => socket.once(event, resolve));

// Socket.IO has no way to ask "is everything delivered?", so wait until
// the sockets have been quiet for a moment.
let lastMessage = 0;
async function settle() {
    do {
        await new Promise((resolve) => setTimeout(resolve, 5));
    } while (Date.now() - lastMessage < 15);
}

async function client(code, name) {
    const socket = connect(url, {
        transports: ["websocket"],
        reconnection: false,
        forceNew: true,
    });
    const player = { socket, view: null, inLobby: true };
    socket.onAny(() => (lastMessage = Date.now()));
    socket.on("updateState", (data) => {
        player.view = rename(data);
        player.inLobby = false;
    });
    socket.on("updatePlayerList", () => (player.inLobby = true));
    await once(socket, "connect");
    if (code) socket.emit("joinGame", { code, name });
    else socket.emit("newGame", { name });
    return player;
}

async function createParty(n) {
    const host = await client(null, "Player 0");
    const { game } = await once(host.socket, "joinGame");
    const players = [host];
    for (let i = 1; i < n; i++) {
        const player = await client(game.code, "Player " + i);
        await once(player.socket, "joinGame");
        players.push(player);
    }
    host.socket.emit("startGame", {});
    await settle();

    return {
        size: n,
        view: (i) => players[i].view,
        phase: (i) =>
            players[i].inLobby ? "lobby" : players[i].view.round.phase,
        async act(i, method, ...args) {
            players[i].socket.emit(...EVENTS[method](...args));
            await settle();
        },
        async drop(i) {
            players[i].socket.disconnect();
            await settle();
        },
        async replace(i, name) {
            const id = players[i].view.you.id;
            const newcomer = await client(game.code, name);
            await once(newcomer.socket, "replace");
            newcomer.socket.emit("tryReplace", { playerIdToReplace: id });
            players[i] = newcomer;
            await settle();
        },
        async close() {
            for (const player of players) player.socket.disconnect();
            await settle();
        },
    };
}

scenarios(createParty, { legacy: true });
