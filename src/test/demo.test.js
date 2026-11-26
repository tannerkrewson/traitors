import { expect, test } from "vitest";
import { createGame } from "../game/game.js";
import { botMoves } from "../game/bots.js";
import { createTalk } from "../demo/talk.js";

// Practice bots must be able to finish any game, and the table talk must
// describe every step without errors.
test.each(["sabotage", "banishment"])(
    "bots always finish a %s game, and the table talks about it",
    (mode) => {
        const game = createGame(mode);
        const players = ["you", "maya", "theo", "priya", "sam"].map((id) => ({
            id,
            name: id,
        }));
        const context = { players, leaderId: "maya" };
        for (let game_ = 0; game_ < 200; game_++) {
            let state = game.createInitialState(context);
            const talk = createTalk("you");
            let winner = null;
            for (let step = 0; step < 500 && state.round; step++) {
                const moves = players.flatMap((actor) =>
                    botMoves(state, actor.id).map((move) => ({
                        actor,
                        ...move,
                    })),
                );
                expect(moves.length).toBeGreaterThan(0);
                const { actor, type, payload } = moves[step % moves.length];
                const next = structuredClone(state);
                game.actions[type](next, { ...context, actor }, payload);
                for (const line of talk(state, next)) {
                    expect(line.text).not.toMatch(/undefined|null|NaN/);
                }
                winner = next.round ? next.round.winner : winner;
                state = next;
            }
            expect(state.round).toBeNull();
            expect(["traitor", "faithful"]).toContain(winner);
        }
    },
);
