const assert = require("node:assert/strict");
const { brotliCompressSync } = require("node:zlib");
const { io } = require("socket.io-client");
const base = process.argv[2] || "http://127.0.0.1:18327";
let socket;
(async () => {
    const home = await fetch(base);
    assert.equal(home.status, 200);
    const html = await home.text();
    assert.match(html, /<div id="root">/);
    for (const asset of html.matchAll(
        /(?:src|href)="([^"]+\/assets\/[^"]+|\/assets\/[^"]+)"/g,
    )) {
        assert.equal((await fetch(new URL(asset[1], base))).status, 200);
    }
    assert.equal((await fetch(base + "/how-to-play")).status, 200);
    const stats = await (await fetch(base + "/stats")).json();
    assert.equal(typeof stats.numberOfConnectedUsers, "number");
    assert.ok(Array.isArray(stats.games));
    for (const type of [
        "application/json",
        "application/x-www-form-urlencoded",
    ]) {
        const raw =
            type === "application/json" ? '{"smoke":true}' : "smoke=true";
        const response = await fetch(base + "/new", {
            method: "POST",
            headers: { "content-type": type, "content-encoding": "br" },
            body: brotliCompressSync(Buffer.from(raw)),
        });
        assert.equal(response.status, 200);
        assert.match((await response.json()).gameCode, /^[a-z]{4}$/);
    }
    socket = io(base, {
        transports: ["websocket"],
        reconnection: false,
        timeout: 5000,
    });
    await new Promise((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("connect_error", reject);
    });
    const joined = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error("join timeout")), 5000);
        socket.once("joinGame", (value) => {
            clearTimeout(timer);
            resolve(value);
        });
        socket.emit("newGame", { name: "Deployment smoke" });
    });
    assert.equal(joined.success, true);
    console.log(
        "PASS HTTP, assets, SPA, stats, valid Brotli JSON/form, WebSocket and game creation",
    );
})()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => socket?.disconnect());
