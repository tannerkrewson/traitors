import { createGame } from "../game/game.js";
import { botMoves } from "../game/bots.js";
import { createLocalParty } from "./nova.js";
import { createTalk } from "./talk.js";

// A practice game against four bots that runs entirely on this device: the
// real rules and screens, with table talk explaining what happens. The demo
// page and the lobby both use it.

const HUMAN = { id: "you", name: "You" };
const BOTS = ["Maya", "Theo", "Priya", "Sam"].map((name) => ({
    id: name.toLowerCase(),
    name,
}));

// how long bots take in each phase, in milliseconds: [least, most]
const PACE = {
    start: [2500, 5000],
    selection: [1200, 1800],
    voting: [1500, 3500],
    voting_results: [2500, 4500],
    mission: [1500, 3000],
    drumroll: [1000, 2500],
    mission_results: [3000, 5000],
    endgame: [2000, 4000],
    round_table: [3000, 6000],
    banishment: [2500, 4500],
    night: [2000, 4000],
    morning: [2500, 4500],
    final: [2500, 4500],
};
const between = ([least, most]) => least + Math.random() * (most - least);

export function createPractice(mode = "sabotage") {
    const game = createGame(mode);
    const party = createLocalParty(game, [HUMAN, ...BOTS], HUMAN.id);
    const talk = createTalk(HUMAN.id);
    const listeners = new Set();
    const timers = new Set();
    const scheduled = new Set();

    function later(ms, run) {
        const timer = setTimeout(() => {
            timers.delete(timer);
            run();
        }, ms);
        timers.add(timer);
    }

    function move(ms, bot, type, payload) {
        later(ms, () => {
            try {
                party.act(bot, type, payload);
            } catch {
                // the game moved on before this bot got to it
            }
        });
    }

    function runBots(state) {
        const round = state.round;
        if (!round) return;
        for (const bot of BOTS) {
            for (const next of botMoves(state, bot.id)) {
                // one move per bot per screen of the game
                const key = [
                    state.currentRoundNum,
                    round.missionNumber,
                    round.rejectedTeams,
                    round.day,
                    round.revote,
                    round.phase,
                    bot.id,
                ].join(":");
                if (scheduled.has(key)) continue;
                scheduled.add(key);

                const delay = between(PACE[round.phase]);
                if (next.type === "submitSelectedPlayers") {
                    // pick one player at a time, so everyone sees it happen
                    const picks = next.payload.selectedPlayers;
                    picks.forEach((_, i) =>
                        move(delay + i * 800, bot, "updateSelectedPlayers", {
                            selectedPlayers: picks.slice(0, i + 1),
                        }),
                    );
                    move(
                        delay + picks.length * 800 + 900,
                        bot,
                        next.type,
                        next.payload,
                    );
                } else {
                    move(delay, bot, next.type, next.payload);
                }
            }
        }
    }

    party.watch((prev, next) => {
        runBots(next);
        // let table talk trickle in rather than all at once
        talk(prev, next).forEach((line, i) =>
            later(i * 900, () => listeners.forEach((listen) => listen(line))),
        );
    });

    return {
        nova: party.nova,
        start: party.start,
        // called with each line of table talk, and once the game has a winner
        onLine(listen) {
            listeners.add(listen);
            return () => listeners.delete(listen);
        },
        stop() {
            for (const timer of timers) clearTimeout(timer);
            timers.clear();
            listeners.clear();
        },
    };
}
