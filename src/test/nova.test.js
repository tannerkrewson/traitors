import { expect } from "vitest";
import { game } from "../game/game.js";
import Connection from "../client/utils/Connection.js";
import { scenarios } from "./scenarios.js";

// A stand-in for Nova: the handlers run here, and every player's
// Connection receives their own view, as in a real party.

const STATE_LIMIT = 512 * 1024;
const PAYLOAD_LIMIT = 16 * 1024;

// Nova only ever keeps plain JSON
function json(value, limit) {
    const text = JSON.stringify(value);
    expect(text.length).toBeLessThan(limit);
    return JSON.parse(text);
}

let nextId = 0;
function member(name) {
    return { id: `p${nextId++}`, name };
}

function createParty(n) {
    const members = Array.from({ length: n }, (_, i) => member("Player " + i));
    const present = new Set(members);
    const leaderId = members[0].id;
    const context = () => ({
        players: [...present].sort((a, b) => a.id.localeCompare(b.id)),
        leaderId,
    });

    let state = json(game.createInitialState(context()), STATE_LIMIT);
    const players = new Map();

    function broadcast() {
        for (const [who, player] of players) {
            if (!present.has(who)) continue;
            player.view = game.selectView(json(state, STATE_LIMIT), who);
            player.listener(player.view);
        }
    }

    function change(update) {
        const next = json(state, STATE_LIMIT);
        update(next);
        state = json(next, STATE_LIMIT);
        broadcast();
    }

    function connect(who) {
        const player = { view: null, error: null, listener: () => {} };
        players.set(who, player);
        const nova = {
            state: {
                get: () => game.selectView(json(state, STATE_LIMIT), who),
                onChange: (listener) => (player.listener = listener),
            },
            onStart: () => {},
            async dispatch({ type, payload }) {
                json(payload, PAYLOAD_LIMIT);
                change((next) =>
                    game.actions[type](
                        next,
                        { ...context(), actor: who },
                        payload,
                    ),
                );
            },
        };
        player.connection = new Connection(() => {}, nova);
        player.connection.onError = (error) => (player.error = error);
        player.view = nova.state.get();
        return player;
    }

    for (const who of members) connect(who);
    const at = (i) => players.get(members[i]);

    return {
        size: n,
        view: (i) => at(i).view,
        phase: (i) => at(i).view.round?.phase ?? "lobby",
        async act(i, method, ...args) {
            await at(i).connection[method](...args);
            if (at(i).error) throw at(i).error;
        },
        async drop(i) {
            present.delete(members[i]);
            change((next) => game.playerLeft(next, context(), members[i]));
        },
        async replace(i, name) {
            const seat = at(i).view.you.id;
            const newcomer = member(name);
            present.add(newcomer);
            connect(newcomer);
            change((next) => game.playerJoined(next, context(), newcomer));
            members[i] = newcomer;
            expect(at(i).view.you).toBeNull();
            const vacant = at(i).view.round.disconnectedList.map((p) => p.id);
            expect(vacant).toContain(seat);
            await this.act(i, "tryReplace", { playerIdToReplace: seat });
        },
        async close() {},
    };
}

scenarios(createParty);
