import { expect, test } from "vitest";
import { game } from "../game/game.js";

const people = (n) =>
    Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
const as = (actor, players) => ({ players, leaderId: players[0].id, actor });

test("waits in the lobby until there are 5 to 10 players", () => {
    const players = people(4);
    const state = game.createInitialState({ players });
    expect(game.selectView(state, players[0]).round).toBeNull();
    expect(() =>
        game.actions.startGame(state, as(players[1], players)),
    ).toThrow("5 to 10");

    const late = { id: "p9", name: "Late" };
    game.playerJoined(state, {}, late);
    game.actions.startGame(state, as(late, [...players, late]));
    expect(game.selectView(state, late).round.phase).toBe("start");
    expect(game.selectView(state, late).you.name).toBe("Late");
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
