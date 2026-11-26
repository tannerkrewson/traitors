import React, { useEffect, useState } from "react";

import App from "../App";
import { createPractice } from "../../demo/practice.js";
import TableLine from "../../demo/TableLine.jsx";

// A practice game over the lobby. It runs only on this device and never
// touches the party, and it goes away when the real game starts.
export default function Practice({ waiting, onClose }) {
    const [practice] = useState(createPractice);
    const [line, setLine] = useState(null);

    useEffect(() => {
        practice.onLine((next) => {
            // the game's own events are already on screen; show the talk
            if (next.kind !== "event" || next.winner) setLine(next);
        });
        practice.start();
        return () => practice.stop();
    }, [practice]);

    return (
        <div className="practice fixed inset-0 z-20 overflow-y-auto bg-base-100 text-center">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-base-content/15 bg-base-200 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
                <span className="text-left text-sm">
                    Practice round
                    <span className="block text-base-content/60">
                        {waiting} in the lobby
                    </span>
                </span>
                <button className="btn btn-sm btn-neutral" onClick={onClose}>
                    Back to lobby
                </button>
            </div>
            {line && (
                <ol className="mx-auto max-w-lg px-5 pt-4 text-left">
                    <TableLine line={line} />
                </ol>
            )}
            <App nova={practice.nova} />
        </div>
    );
}
