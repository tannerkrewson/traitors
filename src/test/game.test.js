import { expect, test } from "vitest";
import { game } from "../game/game.js";
import { botMoves } from "../game/bots.js";

const people = (n) =>
    Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
const as = (actor, players) => ({ players, leaderId: players[0].id, actor });

test("waits in the lobby until there are 3 to 10 players", () => {
    const players = people(2);
    const state = game.createInitialState({ players });
    expect(game.selectView(state, players[0]).round).toBeNull();
    expect(() =>
        game.actions.startGame(state, as(players[1], players)),
    ).toThrow("3 to 10");

    const late = { id: "p9", name: "Late" };
    game.playerJoined(state, {}, late);
    // 3 or 4 players stay in the lobby to read about bots first
    expect(state.round).toBeNull();
    game.actions.startGame(state, as(late, [...players, late]));
    expect(game.selectView(state, late).round.phase).toBe("start");
    expect(game.selectView(state, late).you.name).toBe("Late");
});

test("bots fill a small game and play it to the end", () => {
    for (const humans of [3, 4]) {
        for (let run = 0; run < 50; run++) {
            const players = people(humans);
            const state = game.createInitialState({ players });
            game.actions.startGame(state, as(players[0], players));
            const seats = state.round.players;
            expect(seats).toHaveLength(5);
            expect(seats.filter((seat) => seat.isBot)).toHaveLength(5 - humans);
            const view = game.selectView(state, players[0]).round;
            expect(view.players.filter((p) => p.isBot)).toHaveLength(
                5 - humans,
            );

            let winner = null;
            for (let step = 0; step < 3000 && state.round; step++) {
                for (const player of players) {
                    for (const move of botMoves(state, player.id)) {
                        game.actions[move.type](
                            state,
                            as(player, players),
                            move.payload,
                        );
                    }
                }
                game.tick(state, { dt: 0.5 });
                if (state.round) winner = state.round.winner || winner;
            }
            expect(state.round).toBeNull();
            expect(["traitor", "faithful"]).toContain(winner);
        }
    }
});

test("a player who comes back gets their seat back", () => {
    const players = people(5);
    const state = game.createInitialState({ players });
    const before = game.selectView(state, players[2]).you;
    game.playerLeft(state, {}, players[2]);
    expect(
        game.selectView(state, players[0]).round.disconnectedList,
    ).toHaveLength(1);
    game.playerJoined(state, {}, { ...players[2], name: "Back" });
    expect(game.selectView(state, players[2]).you).toEqual({
        ...before,
        name: "Back",
    });
    expect(
        game.selectView(state, players[0]).round.disconnectedList,
    ).toHaveLength(0);
});

test("rejects moves from the wrong player or a stale screen", () => {
    const players = people(5);
    const state = game.createInitialState({ players });
    const outsider = { id: "x", name: "X" };
    game.playerJoined(state, {}, outsider);
    expect(() =>
        game.actions.doneViewingStart(state, as(outsider, players)),
    ).toThrow("not in this game");
    expect(() =>
        game.actions.replacePlayer(state, as(outsider, players), {
            playerIdToReplace: 1,
        }),
    ).toThrow("still here");
    expect(() =>
        game.actions.doneViewingResults(state, as(players[0], players)),
    ).toThrow("moved on");
    game.actions.doneViewingStart(state, as(players[0], players));
    expect(() =>
        game.actions.doneViewingStart(state, as(players[0], players)),
    ).toThrow("already done");
    expect(() => game.actions.endGame(state, as(players[1], players))).toThrow(
        "party leader",
    );
    game.actions.endGame(state, as(players[0], players));
    expect(state.round).toBeNull();
});
