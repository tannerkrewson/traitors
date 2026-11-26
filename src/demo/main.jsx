import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import App from "../client/App.jsx";
import { game } from "../game/game.js";
import { botMoves } from "../game/bots.js";
import { createLocalParty } from "./nova.js";
import { createTalk } from "./talk.js";

// The real game and screens, played against four bots in this page.

const HUMAN = { id: "you", name: "You" };
const BOTS = ["Maya", "Theo", "Priya", "Sam"].map((name) => ({
    id: name.toLowerCase(),
    name,
}));

const party = createLocalParty(game, [HUMAN, ...BOTS], HUMAN.id);
window.nova = party.nova;

// how long bots take in each phase, in milliseconds: [least, most]
const PACE = {
    start: [2500, 5000],
    selection: [1200, 1800],
    voting: [1500, 3500],
    voting_results: [2500, 4500],
    mission: [1500, 3000],
    drumroll: [1000, 2500],
    mission_results: [3000, 5000],
};
const between = ([least, most]) => least + Math.random() * (most - least);

const scheduled = new Set();
function later(ms, bot, type, payload) {
    setTimeout(() => {
        try {
            party.act(bot, type, payload);
        } catch {
            // the game moved on before this bot got to it
        }
    }, ms);
}

function runBots(state) {
    const round = state.round;
    if (!round) return;
    for (const bot of BOTS) {
        for (const move of botMoves(state, bot.id)) {
            const key = [
                state.currentRoundNum,
                round.missionNumber,
                round.rejectedTeams,
                round.phase,
                bot.id,
            ].join(":");
            if (scheduled.has(key)) continue;
            scheduled.add(key);

            const delay = between(PACE[round.phase]);
            if (move.type === "submitSelectedPlayers") {
                // pick one player at a time, so everyone sees it happen
                const picks = move.payload.selectedPlayers;
                picks.forEach((_, i) =>
                    later(delay + i * 800, bot, "updateSelectedPlayers", {
                        selectedPlayers: picks.slice(0, i + 1),
                    }),
                );
                later(
                    delay + picks.length * 800 + 900,
                    bot,
                    move.type,
                    move.payload,
                );
            } else {
                later(delay, bot, move.type, move.payload);
            }
        }
    }
}

function Demo() {
    const [lines, setLines] = useState([]);
    const [over, setOver] = useState(false);
    const log = useRef(null);

    useEffect(() => {
        const talk = createTalk(HUMAN.id);
        party.watch((prev, next) => {
            runBots(next);
            if (next.round && next.round.winner) setOver(true);
            // let table talk trickle in rather than all at once
            talk(prev, next).forEach((line, i) =>
                setTimeout(() => setLines((all) => [...all, line]), i * 900),
            );
        });
        party.start();
        if (window.gtag) window.gtag("event", "demo_start");
    }, []);

    useEffect(() => {
        if (log.current) log.current.scrollTop = log.current.scrollHeight;
    }, [lines]);

    return (
        <div className="grid items-start gap-6 md:grid-cols-[1fr_24rem]">
            <div className="demo-phone h-[42rem] overflow-y-auto rounded-[2rem] border border-base-content/15 bg-base-100 shadow-2xl">
                <App />
            </div>
            <aside className="order-first flex h-56 flex-col gap-3 rounded-box bg-base-200 p-4 md:h-[42rem]">
                <h2 className="font-display text-2xl font-semibold">
                    The table
                </h2>
                <ol
                    ref={log}
                    className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1"
                    aria-live="polite"
                >
                    {lines.map((line, i) => (
                        <TableLine key={i} line={line} />
                    ))}
                </ol>
                {over && (
                    <div className="flex flex-col gap-2 border-t border-base-content/15 pt-3">
                        <p>
                            That's Traitors. With real friends, the arguing is
                            the best part.
                        </p>
                        <a
                            className="btn btn-primary no-underline"
                            href="https://rocketcrab.com/transfer/traitors"
                        >
                            Start a game with friends
                        </a>
                    </div>
                )}
            </aside>
        </div>
    );
}

function TableLine({ line }) {
    if (line.kind === "event") {
        return <li className="text-sm text-base-content/55">{line.text}</li>;
    }
    if (line.kind === "guide") {
        return (
            <li className="border-l-2 border-primary pl-3 text-sm">
                {line.text}
            </li>
        );
    }
    return (
        <li className="self-start rounded-box bg-base-300 px-3 py-2">
            <span className="font-bold text-primary">{line.from}</span>{" "}
            {line.text}
        </li>
    );
}

createRoot(document.getElementById("demo")).render(<Demo />);
