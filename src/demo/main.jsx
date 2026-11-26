import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import App from "../client/App.jsx";
import { createPractice } from "./practice.js";
import TableLine from "./TableLine.jsx";

// The demo page: a practice game against four bots, with the table talk
// beside it.

const practice = createPractice();

function Demo() {
    const [lines, setLines] = useState([]);
    const log = useRef(null);
    const over = lines.some((line) => line.winner);

    useEffect(() => {
        practice.onLine((line) => setLines((all) => [...all, line]));
        practice.start();
        if (window.gtag) window.gtag("event", "demo_start");
    }, []);

    useEffect(() => {
        if (log.current) log.current.scrollTop = log.current.scrollHeight;
    }, [lines]);

    return (
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

createRoot(document.getElementById("demo")).render(<Demo />);
