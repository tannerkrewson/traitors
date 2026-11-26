// What the demo's table says as the game moves along: a guide that explains
// each part the first time it comes up, and the bots' table talk, written
// from what actually happened.

import { suspicion } from "../game/bots.js";

const pickOne = (list, random) =>
    list.length ? list[Math.floor(random() * list.length)] : undefined;

export function createTalk(humanId, random = Math.random) {
    const explained = new Set();

    return function talk(prev, next) {
        const lines = [];
        const round = next.round;
        const before = prev && prev.round;
        if (!round) return lines;

        const isHuman = (player) => player.partyId === humanId;
        const name = (player) => (isHuman(player) ? "you" : player.name);
        const names = (players) => {
            const list = players.map(name);
            return list.length > 1
                ? list.slice(0, -1).join(", ") + " and " + list.at(-1)
                : list.join("");
        };
        const seat = (id) => round.players.find((player) => player.id === id);
        const bots = round.players.filter((player) => !isHuman(player));
        const human = round.players.find(isHuman);

        const say = (player, text) =>
            lines.push({ from: player.name, text: capitalize(text) });
        const event = (text) => lines.push({ kind: "event", text });
        const gameOver = (text) =>
            lines.push({ kind: "event", text, winner: round.winner });
        const guide = (key, text) => {
            if (explained.has(key)) return;
            explained.add(key);
            lines.push({ kind: "guide", text });
        };

        const newGame = !before || before.roundNumber !== round.roundNumber;
        if (!newGame && before.phase === round.phase) return lines;
        const mission = round.missions[round.missionNumber - 1];

        switch (round.phase) {
            case "start":
                event(
                    `A new game with ${round.players.length} players and ${round.traitorCount} traitors.`,
                );
                guide(
                    "start",
                    "Everyone has a secret role. Hold the button to see yours. Traitors also learn who the other traitors are.",
                );
                break;

            case "selection": {
                const captain = round.players.find((p) => p.isCaptain);
                event(
                    `Mission ${mission.number}: ${name(captain)} ${isHuman(captain) ? "are" : "is"} captain.`,
                );
                if (isHuman(captain)) {
                    guide(
                        "captain-you",
                        `You're the captain. Pick ${mission.playersNeeded} players for the mission, yourself included if you like, and put it to a vote.`,
                    );
                } else {
                    guide(
                        "captain",
                        "The captain picks a team for the mission. Everyone can watch the picks as they're made.",
                    );
                }
                break;
            }

            case "voting": {
                guide(
                    "vote",
                    "Now everyone votes on the team, in the open. If most reject it, or it's a tie, the next captain tries.",
                );
                const team = mission.potentialPlayersOnMission.map(seat);
                const score = suspicion(round);
                const suspect = team.find((p) => score[p.id]);
                const left = pickOne(
                    bots.filter((p) => !team.includes(p) && !p.isCaptain),
                    random,
                );
                if (suspect && left) {
                    say(
                        left,
                        `${name(suspect)} ${isHuman(suspect) ? "were" : "was"} on a sabotaged mission. I don't like this team.`,
                    );
                } else if (left && random() < 0.6) {
                    say(
                        left,
                        pickOne(
                            [
                                "Why am I not on this? Fine.",
                                `I'd rather see ${name(pickOne(team, random))} sit this one out.`,
                                "Seems reasonable. For now.",
                            ],
                            random,
                        ),
                    );
                }
                break;
            }

            case "voting_results": {
                const votes = mission.votes;
                const approved = votes.filter((v) => v.vote).length;
                const passed = approved > votes.length - approved;
                if (round.winner) {
                    gameOver(
                        "Five teams in a row were rejected. The traitors win.",
                    );
                    break;
                }
                event(
                    passed
                        ? `The team is approved, ${approved} to ${votes.length - approved}.`
                        : `The team is rejected, ${votes.length - approved} to ${approved}.`,
                );
                if (!passed && round.rejectedTeams >= 3) {
                    guide(
                        "rejections",
                        "Careful: if five teams in a row are rejected, the traitors win.",
                    );
                }
                // someone notices who voted against the table
                const odd = votes.find((v) => v.vote !== passed);
                const watcher = pickOne(
                    bots.filter((p) => p.id !== (odd && odd.playerId)),
                    random,
                );
                if (odd && watcher && random() < 0.7) {
                    say(
                        watcher,
                        `${name(seat(odd.playerId))} voted ${odd.vote ? "for" : "against"} that team. Noted.`,
                    );
                }
                break;
            }

            case "mission": {
                const team = mission.playersOnMission.map(seat);
                if (team.includes(human)) {
                    guide(
                        human.isTraitor
                            ? "mission-traitor"
                            : "mission-faithful",
                        human.isTraitor
                            ? "You're on the mission. Sabotage it, or pass to keep your cover. Nobody sees your choice, only the count."
                            : "You're on the mission. The faithful should always pass.",
                    );
                } else {
                    guide(
                        "mission-wait",
                        "The team decides the mission in secret. Everyone learns how many sabotaged, but not who.",
                    );
                }
                break;
            }

            case "mission_results": {
                const team = mission.playersOnMission.map(seat);
                const fails = mission.missionVotes.filter(
                    (v) => !v.vote,
                ).length;
                if (mission.status === "traitor") {
                    event(
                        `Mission ${mission.number} was sabotaged ${fails === 1 ? "once" : fails + " times"}.`,
                    );
                    const accuser = pickOne(
                        bots.filter((p) => !team.includes(p)),
                        random,
                    );
                    const accused = pickOne(
                        team.filter((p) => p !== accuser),
                        random,
                    );
                    if (accuser && team.length === 2) {
                        say(
                            accuser,
                            `It was ${names(team)}. One of you is lying.`,
                        );
                    } else if (accuser && accused) {
                        say(
                            accuser,
                            `One of ${names(team)} is a traitor. ${capitalize(name(accused))}, you've been quiet.`,
                        );
                    }
                    const defender = pickOne(
                        team.filter((p) => !isHuman(p)),
                        random,
                    );
                    // innocent or not, everyone sounds the same
                    if (defender) {
                        say(
                            defender,
                            pickOne(
                                [
                                    "I passed! Someone is trying to frame me.",
                                    "It wasn't me. I passed, I swear.",
                                    "Don't look at me. I'd never.",
                                ],
                                random,
                            ),
                        );
                    }
                    guide(
                        "evidence",
                        "Keep track of who was on each sabotaged mission. It's the best evidence you'll get.",
                    );
                } else {
                    event(`Mission ${mission.number} passed.`);
                    const skeptic = pickOne(bots, random);
                    if (skeptic && random() < 0.6) {
                        say(
                            skeptic,
                            "A clean mission doesn't prove they're all faithful. Traitors can pass too.",
                        );
                    }
                }
                if (round.winner) {
                    const traitors = round.players.filter((p) => p.isTraitor);
                    gameOver(
                        `${round.winner === "traitor" ? "The traitors" : "The faithful"} win. The traitors were ${names(traitors)}.`,
                    );
                }
                break;
            }
        }
        return lines;
    };
}

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
