import React from "react";

// one line of the practice game's table talk
export default function TableLine({ line }) {
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
