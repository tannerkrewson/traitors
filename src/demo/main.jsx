import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import App from "../client/App.jsx";
import { createPractice } from "./practice.js";
import TableLine from "./TableLine.jsx";

// The demo page: a practice game against four bots, with the table talk
// beside it.

// ?game=banishment plays Banishment; Sabotage otherwise
const mode =
    new URLSearchParams(location.search).get("game") === "banishment"
        ? "banishment"
        : "sabotage";
const practice = createPractice(mode);

const GAMES = [
    {
        mode: "sabotage",
        name: "Sabotage",
        href: "demo",
        tagline: "Pass three missions before the traitors wreck them.",
        inspiredBy: "Inspired by The Resistance",
    },
    {
        mode: "banishment",
        name: "Banishment",
        href: "demo?game=banishment",
        tagline: "Vote out the traitors before they pick everyone off.",
        inspiredBy: "Inspired by Mafia, Werewolf and the TV show",
    },
];

function Demo() {
    const [lines, setLines] = useState([]);
    const log = useRef(null);
    const over = lines.some((line) => line.winner);

    useEffect(() => {
        practice.onLine((line) => setLines((all) => [...all, line]));
        practice.start();
        if (window.gtag) {
            window.gtag("event", "demo_start", { event_label: mode });
        }
    }, []);

    useEffect(() => {
        if (log.current) log.current.scrollTop = log.current.scrollHeight;
    }, [lines]);

    return (
        <div className="flex flex-col gap-4">
            <nav
                className="grid gap-3 sm:grid-cols-2"
                aria-label="Choose a game to try"
            >
                {GAMES.map((game) => {
                    const active = game.mode === mode;
                    return (
                        <a
                            key={game.mode}
                            href={game.href}
                            aria-current={active ? "page" : undefined}
                            className={
                                "card gap-1 border-2 p-5 no-underline transition-colors " +
                                (active
                                    ? "border-primary bg-base-200"
                                    : "border-transparent bg-base-200/60 hover:border-base-content/25")
                            }
                        >
                            <span className="flex items-baseline justify-between gap-3">
                                <span className="font-display text-3xl font-semibold text-primary">
                                    {game.name}
                                </span>
                                <span
                                    className={
                                        "text-sm " +
                                        (active
                                            ? "text-primary"
                                            : "text-base-content/60")
                                    }
                                >
                                    {active
                                        ? "Playing now"
                                        : "Try this instead"}
                                </span>
                            </span>
                            <span>{game.tagline}</span>
                            <span className="section-label">
                                {game.inspiredBy}
                            </span>
                        </a>
                    );
                })}
            </nav>
            <div className="grid items-start gap-6 md:grid-cols-[1fr_24rem]">
                <div className="demo-phone h-[42rem] overflow-y-auto rounded-[2rem] border border-base-content/15 bg-base-100 shadow-2xl">
                    <App nova={practice.nova} />
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
                                That's Traitors. With real friends, the arguing
                                is the best part.
                            </p>
                            <a
                                className="btn btn-primary no-underline"
                                href={
                                    "https://rocketcrab.com/transfer/" +
                                    (mode === "banishment"
                                        ? "traitors-banishment"
                                        : "traitors")
                                }
                            >
                                Start a game with friends
                            </a>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}

createRoot(document.getElementById("demo")).render(<Demo />);
