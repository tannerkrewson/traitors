import React, { useEffect, useState } from "react";

import PlayerList from "./PlayerList";
import PlayerSelector from "./PlayerSelector";
import RoleViewer from "./RoleViewer";
import SOButton from "./SOButton";
import TraitorList from "./TraitorList";

// Every screen of a Banishment game. Props: you, round, server.
export default function Banishment({ you, round, server }) {
    const waiting = round.waitingList.some((player) => player.id === you.id);
    const living = round.players.filter((player) => player.alive);
    const nameOf = (player) => (player.id === you.id ? "You" : player.name);

    useEffect(() => {
        if (round.phase === "start" && you.isAdmin) {
            gtag("event", "game_start", { event_label: "banishment" });
        }
        if (round.phase === "final" && you.isAdmin) {
            gtag("event", "game_result", {
                event_label: "banishment_" + round.winner,
            });
        }
    }, [round.phase, round.winner, you.isAdmin]);

    const next = (
        <SOButton primary onClick={() => server.doneViewing(round.phase)}>
            Next
        </SOButton>
    );
    const stillWaiting = (message) => (
        <>
            <p>{message}</p>
            <PlayerList players={round.waitingList} />
        </>
    );

    let screen;
    switch (round.phase) {
        case "start":
            screen = (
                <>
                    <p className="so-h2">Welcome to Traitors</p>
                    <p>
                        Among you{" "}
                        {round.traitorCount === 1
                            ? "is 1 traitor"
                            : "are " + round.traitorCount + " traitors"}
                        . Each day, the round table banishes someone. Each
                        night, the traitors murder someone. Check your role in
                        secret, then begin.
                    </p>
                    {waiting ? (
                        <SOButton
                            primary
                            onClick={() => server.doneViewing("start")}
                        >
                            Begin
                        </SOButton>
                    ) : (
                        stillWaiting("Waiting for everyone to begin...")
                    )}
                </>
            );
            break;

        case "endgame":
            screen = (
                <>
                    <p className="so-h2">Only {living.length} remain</p>
                    <p>
                        Vote to end the game now, or to banish one more. It ends
                        only if everyone votes to end it, and if a traitor is
                        still among you, the traitors win.
                    </p>
                    {waiting && you.alive ? (
                        <div className="grid grid-cols-2 gap-3">
                            <SOButton onClick={() => server.endgameVote(false)}>
                                Banish again
                            </SOButton>
                            <SOButton
                                primary
                                onClick={() => server.endgameVote(true)}
                            >
                                End the game
                            </SOButton>
                        </div>
                    ) : (
                        stillWaiting("Waiting for everyone to vote...")
                    )}
                </>
            );
            break;

        case "round_table":
            screen = (
                <>
                    <p className="so-h2">
                        {round.revote
                            ? "A tie"
                            : "Day " + round.day + ": the round table"}
                    </p>
                    {round.lastEndVotes && (
                        <p className="section-label">
                            The table voted to keep going,{" "}
                            {round.lastEndVotes.banish} to{" "}
                            {round.lastEndVotes.end}.
                        </p>
                    )}
                    {round.revote && (
                        <>
                            <Votes votes={round.lastVotes} nameOf={nameOf} />
                            <p>Vote again between the tied players.</p>
                        </>
                    )}
                    {waiting && you.alive ? (
                        <BanishVote round={round} you={you} server={server} />
                    ) : round.myVote ? (
                        stillWaiting(
                            "You voted to banish " +
                                round.myVote.name +
                                ". Still deciding:",
                        )
                    ) : (
                        stillWaiting("The table is voting. Still deciding:")
                    )}
                </>
            );
            break;

        case "banishment": {
            const banished = round.banished;
            screen = (
                <>
                    {banished ? (
                        <>
                            <p className="so-h2">
                                {banished.id === you.id
                                    ? "You are banished"
                                    : banished.name + " is banished"}
                            </p>
                            <p
                                className={
                                    "font-display text-4xl font-semibold " +
                                    (banished.isTraitor
                                        ? "text-error"
                                        : "text-primary")
                                }
                            >
                                {banished.isTraitor ? "A Traitor" : "Faithful"}
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="so-h2">No one is banished</p>
                            <p>The table couldn't agree.</p>
                        </>
                    )}
                    <Votes votes={round.lastVotes} nameOf={nameOf} />
                    {waiting ? next : stillWaiting("Waiting for everyone...")}
                </>
            );
            break;
        }

        case "night":
            screen =
                you.alive && you.isTraitor && waiting ? (
                    <NightPick round={round} server={server} nameOf={nameOf} />
                ) : (
                    <>
                        <p className="so-h2">Night falls</p>
                        {you.alive && !you.isTraitor ? (
                            <p>
                                The traitors are choosing their victim. Sleep
                                well.
                            </p>
                        ) : (
                            <NightPicks round={round} nameOf={nameOf} />
                        )}
                    </>
                );
            break;

        case "morning": {
            const { murdered, recruited } = round;
            screen = (
                <>
                    <p className="so-h2">Morning, day {round.day}</p>
                    <p className="text-lg">
                        {murdered
                            ? (murdered.id === you.id
                                  ? "You were"
                                  : murdered.name + " was") +
                              " murdered in the night."
                            : "No one was murdered last night."}
                    </p>
                    {recruited &&
                        (recruited.id === you.id ? (
                            <p className="text-error">
                                The traitors recruited you. You're a traitor
                                now, and your role card shows who the others
                                are.
                            </p>
                        ) : (
                            <p>
                                {recruited.name} was recruited to the traitors'
                                side.
                            </p>
                        ))}
                    {waiting ? next : stillWaiting("Waiting for everyone...")}
                </>
            );
            break;
        }

        case "final":
            screen = (
                <>
                    <p className="so-h2">
                        {round.winner === "traitor"
                            ? "The Traitors win"
                            : "The Faithful win"}
                    </p>
                    <TraitorList players={round.players} />
                    {waiting ? next : stillWaiting("Waiting for everyone...")}
                </>
            );
            break;
    }

    return (
        <div className="banishment flex flex-col gap-4">
            {!you.alive && round.phase !== "final" && (
                <p className="alert alert-soft">
                    You were {you.fate || "eliminated"}. You can still watch,
                    and you can see who the traitors are.
                </p>
            )}
            {screen}
            {round.disconnectedList.length > 0 && (
                <div className="alert alert-vertical alert-warning alert-soft">
                    <p>These players left the game:</p>
                    <PlayerList players={round.disconnectedList} />
                    <p>
                        The game will continue when someone joins the party to
                        take their place.
                    </p>
                    {you.isAdmin && (
                        <SOButton onClick={() => server.endGame()}>
                            End Game
                        </SOButton>
                    )}
                </div>
            )}
            <div className="mt-4 flex flex-col gap-4 border-t border-base-content/20 pt-6">
                <RoleViewer
                    role={you.isTraitor ? "traitor" : "faithful"}
                    mode="banishment"
                    players={round.players}
                    me={you}
                />
                <p className="section-label">{living.length} remain</p>
                <PlayerList players={living} />
                <Gone
                    players={round.players.filter((player) => !player.alive)}
                />
            </div>
        </div>
    );
}

function BanishVote({ round, you, server }) {
    const [choice, setChoice] = useState([]);
    const options = round.candidates.filter((player) => player.id !== you.id);
    return (
        <>
            <p>Who should be banished?</p>
            <PlayerSelector
                key={round.day + ":" + round.revote}
                players={options}
                numPlayersToSelect={1}
                onChange={setChoice}
            />
            <SOButton
                primary
                disabled={choice.length !== 1}
                onClick={() => server.banishVote(choice[0])}
            >
                Cast your vote
            </SOButton>
        </>
    );
}

function NightPick({ round, server, nameOf }) {
    const [choice, setChoice] = useState([]);
    const faithful = round.players.filter(
        (player) => player.alive && !player.isTraitor,
    );
    return (
        <>
            <p className="so-h2">Night falls</p>
            <p>
                {round.recruiting
                    ? "One of you was banished. Choose a faithful player to recruit to your side."
                    : "Choose who to murder tonight."}
            </p>
            <PlayerSelector
                key={round.day}
                players={faithful}
                numPlayersToSelect={1}
                onChange={setChoice}
            />
            <NightPicks round={round} nameOf={nameOf} />
            <SOButton
                primary
                disabled={choice.length !== 1}
                onClick={() => server.nightPick(choice[0])}
            >
                {round.recruiting ? "Recruit" : "Murder"}
            </SOButton>
        </>
    );
}

// what the traitors have chosen so far, for the traitors and the eliminated
function NightPicks({ round, nameOf }) {
    if (!round.nightPicks.length) return null;
    return (
        <ul className="section-label">
            {round.nightPicks.map(({ traitor, target }) => (
                <li key={traitor.id}>
                    {nameOf(traitor)} chose {target.name}.
                </li>
            ))}
        </ul>
    );
}

function Votes({ votes, nameOf }) {
    if (!votes.length) return null;
    return (
        <ul className="flex flex-col gap-1 text-sm text-base-content/75">
            {votes.map(({ voter, target }) => (
                <li key={voter.id}>
                    {nameOf(voter)} voted for {nameOf(target)}
                </li>
            ))}
        </ul>
    );
}

function Gone({ players }) {
    if (!players.length) return null;
    return (
        <ul className="section-label flex flex-col gap-1">
            {players.map((player) => (
                <li key={player.id}>
                    {player.name}: {player.fate},{" "}
                    {player.isTraitor ? "a traitor" : "faithful"}
                </li>
            ))}
        </ul>
    );
}
