import { describe, expect, it } from "vitest";

// The rules, written against a small driver so the same scenarios run
// against every implementation of the game. A driver's createParty(n)
// returns a started game with n players; player i is addressed by index:
//   view(i)              the { you, round } payload player i renders
//   phase(i)             round.phase, or "lobby" between games
//   act(i, method, ...)  a Connection method, e.g. act(0, "vote", true)
//   drop(i)              player i leaves for good
//   replace(i, name)     a newcomer takes player i's seat
//   close()

const TEAM_SIZES = {
    5: [2, 3, 2, 3, 3],
    6: [2, 3, 4, 3, 4],
    7: [2, 3, 3, 4, 4],
    8: [3, 4, 4, 5, 5],
    9: [3, 4, 4, 5, 5],
    10: [3, 4, 4, 5, 5],
};

export function scenarios(createParty, { legacy = false } = {}) {
    const traitorCount = { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: legacy ? 3 : 4 };

    const all = (party) => [...Array(party.size).keys()];
    const me = (party, i) => party.view(i).you;
    const round = (party) => party.view(0).round;
    const indexOf = (party, id) =>
        all(party).find((i) => me(party, i).id === id);
    const isTraitor = (party, i) => me(party, i).isTraitor;
    const captain = (party) => all(party).find((i) => me(party, i).isCaptain);
    const mission = (party) => round(party).currentMission;

    async function everyone(party, method, ...args) {
        for (const i of all(party)) await party.act(i, method, ...args);
    }

    // a team of `size` players with exactly `traitors` traitors on it
    function team(party, size, traitors) {
        const players = round(party).players;
        const pick = (wanted) =>
            players.filter(
                (player) =>
                    isTraitor(party, indexOf(party, player.id)) === wanted,
            );
        const chosen = [
            ...pick(true).slice(0, traitors),
            ...pick(false).slice(0, size - traitors),
        ];
        expect(chosen).toHaveLength(size);
        return chosen;
    }

    async function propose(party, players, approvals = party.size) {
        await party.act(captain(party), "submitSelectedPlayers", players);
        for (const i of all(party)) await party.act(i, "vote", i < approvals);
        expect(party.phase(0)).toBe("voting_results");
        await everyone(party, "doneViewingVoteResults");
    }

    // the traitors on the team fail it; returns once results are showing
    async function playMission(party, fails) {
        const players = team(party, mission(party).playersNeeded, fails);
        await propose(party, players);
        expect(party.phase(0)).toBe("mission");
        for (const player of players) {
            const i = indexOf(party, player.id);
            await party.act(i, "missionVote", !isTraitor(party, i));
        }
        expect(party.phase(0)).toBe("drumroll");
        await everyone(party, "readyToViewResults");
        expect(party.phase(0)).toBe("mission_results");
    }

    async function started(n) {
        const party = await createParty(n);
        expect(party.phase(0)).toBe("start");
        await everyone(party, "doneViewingStart");
        expect(party.phase(0)).toBe("selection");
        return party;
    }

    describe("setup", () => {
        for (const n of [5, 6, 7, 8, 9, 10]) {
            it(`${n} players get the right teams and traitors`, async () => {
                const party = await createParty(n);
                const view = round(party);
                expect(view.missions.map((m) => m.playersNeeded)).toEqual(
                    TEAM_SIZES[n],
                );
                expect(view.traitorCount).toBe(traitorCount[n]);
                expect(
                    all(party).filter((i) => isTraitor(party, i)),
                ).toHaveLength(traitorCount[n]);
                expect(
                    all(party).filter((i) => me(party, i).isCaptain),
                ).toHaveLength(1);
                await party.close();
            });
        }

        it("waits for everyone to read their role", async () => {
            const party = await createParty(5);
            expect(round(party).waitingList).toHaveLength(5);
            await party.act(0, "doneViewingStart");
            expect(round(party).waitingList).toHaveLength(4);
            expect(party.phase(0)).toBe("start");
            await party.close();
        });
    });

    describe("secrets", () => {
        it.skipIf(legacy)(
            "only traitors know who the traitors are",
            async () => {
                const party = await createParty(7);
                for (const i of all(party)) {
                    const known = round(party).players.length;
                    const seen = party
                        .view(i)
                        .round.players.filter((player) => player.isTraitor);
                    expect(known).toBe(7);
                    expect(seen).toHaveLength(isTraitor(party, i) ? 3 : 0);
                }
                await party.close();
            },
        );

        it.skipIf(legacy)(
            "the player order does not reveal the traitors",
            async () => {
                let firstIsTraitor = 0;
                for (let game = 0; game < 30; game++) {
                    const party = await createParty(5);
                    const first = round(party).players[0];
                    if (isTraitor(party, indexOf(party, first.id)))
                        firstIsTraitor++;
                    await party.close();
                }
                expect(firstIsTraitor).toBeGreaterThan(0);
                expect(firstIsTraitor).toBeLessThan(30);
            },
        );

        it.skipIf(legacy)("mission votes are anonymous", async () => {
            const party = await started(5);
            await playMission(party, 1);
            for (const vote of mission(party).missionVotes) {
                expect(vote).not.toHaveProperty("playerId");
            }
            await party.close();
        });
    });

    describe("team selection", () => {
        it("shows the captain's picks to everyone as they make them", async () => {
            const party = await started(5);
            const picks = round(party).players.slice(0, 1);
            await party.act(captain(party), "updateSelectedPlayers", picks);
            for (const i of all(party)) {
                expect(
                    party
                        .view(i)
                        .round.captainsSelectedPlayers.map((p) => p.id),
                ).toEqual(picks.map((p) => p.id));
            }
            await party.close();
        });

        it("a rejected or tied vote passes the captaincy on", async () => {
            const party = await started(6);
            const first = captain(party);
            await propose(party, team(party, 2, 0), 3);
            expect(party.phase(0)).toBe("selection");
            expect(mission(party).number).toBe(1);
            expect(captain(party)).not.toBe(first);
            const votes = mission(party).votes;
            expect(votes.filter((vote) => vote.vote)).toHaveLength(3);
            await party.close();
        });

        it("everyone is captain once before anyone is captain again", async () => {
            const party = await started(5);
            const captains = [captain(party)];
            for (let rejection = 0; rejection < 4; rejection++) {
                await propose(party, team(party, 2, 0), 0);
                captains.push(captain(party));
            }
            expect(new Set(captains).size).toBe(5);
            await party.close();
        });

        it.skipIf(legacy)(
            "five rejected teams in a row lose the game",
            async () => {
                const party = await started(5);
                for (let rejection = 0; rejection < 4; rejection++) {
                    await propose(party, team(party, 2, 0), 0);
                    expect(round(party).rejectedTeams).toBe(rejection + 1);
                }
                await party.act(
                    captain(party),
                    "submitSelectedPlayers",
                    team(party, 2, 0),
                );
                for (const i of all(party)) await party.act(i, "vote", false);
                expect(round(party).winner).toBe("traitor");
                await everyone(party, "doneViewingVoteResults");
                expect(party.phase(0)).toBe("lobby");
                await party.close();
            },
        );

        it.skipIf(legacy)(
            "an approved team resets the rejection count",
            async () => {
                const party = await started(5);
                await propose(party, team(party, 2, 0), 0);
                expect(round(party).rejectedTeams).toBe(1);
                await playMission(party, 0);
                await everyone(party, "doneViewingResults");
                expect(round(party).rejectedTeams).toBe(0);
                await party.close();
            },
        );
    });

    describe("missions", () => {
        it("the faithful win three clean missions", async () => {
            const party = await started(5);
            for (let n = 1; n <= 3; n++) {
                expect(mission(party).number).toBe(n);
                await playMission(party, 0);
                expect(mission(party).status).toBe("faithful");
                if (n < 3) await everyone(party, "doneViewingResults");
            }
            expect(round(party).missions.map((m) => m.status)).toEqual([
                "faithful",
                "faithful",
                "faithful",
                false,
                false,
            ]);
            // the traitors are revealed once the game is over
            for (const i of all(party)) {
                const revealed = party
                    .view(i)
                    .round.players.filter((player) => player.isTraitor);
                expect(revealed).toHaveLength(2);
            }
            await everyone(party, "doneViewingResults");
            expect(party.phase(0)).toBe("lobby");
            await party.close();
        });

        it("the traitors win by failing three missions", async () => {
            const party = await started(5);
            for (let n = 1; n <= 3; n++) {
                await playMission(party, 1);
                expect(mission(party).status).toBe("traitor");
                const votes = mission(party).missionVotes;
                expect(votes.filter((vote) => !vote.vote)).toHaveLength(1);
                if (n < 3) await everyone(party, "doneViewingResults");
            }
            await everyone(party, "doneViewingResults");
            expect(party.phase(0)).toBe("lobby");
            await party.close();
        });

        it("with 7 or more players, mission 4 needs two fails", async () => {
            const party = await started(7);
            for (const fails of [1, 0, 1]) {
                await playMission(party, fails);
                await everyone(party, "doneViewingResults");
            }
            expect(mission(party).number).toBe(4);
            await playMission(party, 1);
            expect(mission(party).status).toBe("faithful");
            await everyone(party, "doneViewingResults");
            expect(mission(party).number).toBe(5);
            await playMission(party, 2);
            expect(mission(party).status).toBe("traitor");
            await party.close();
        });

        it("with 7 or more players, two fails still fail mission 4", async () => {
            const party = await started(7);
            for (const fails of [1, 0, 1]) {
                await playMission(party, fails);
                await everyone(party, "doneViewingResults");
            }
            await playMission(party, 2);
            expect(mission(party).status).toBe("traitor");
            await everyone(party, "doneViewingResults");
            expect(party.phase(0)).toBe("lobby");
            await party.close();
        });

        it("with 5 players, one fail fails mission 4", async () => {
            const party = await started(5);
            for (const fails of [1, 0, 0]) {
                await playMission(party, fails);
                await everyone(party, "doneViewingResults");
            }
            await playMission(party, 1);
            expect(mission(party).status).toBe("traitor");
            await party.close();
        });

        it("a new game can start after one ends", async () => {
            const party = await started(5);
            for (let n = 1; n <= 3; n++) {
                await playMission(party, 0);
                await everyone(party, "doneViewingResults");
            }
            expect(party.phase(0)).toBe("lobby");
            await party.act(1, "startGame");
            expect(party.phase(0)).toBe("start");
            expect(round(party).missions.every((m) => !m.status)).toBe(true);
            await party.close();
        });
    });

    describe("players leaving", () => {
        it("the game waits for a replacement, who inherits the seat", async () => {
            const party = await started(5);
            // player 0 stays, so round(party) keeps reading a live view
            const leaver = all(party).find((i) => i && i !== captain(party));
            const seat = me(party, leaver);
            await party.drop(leaver);
            expect(round(party).disconnectedList.map((p) => p.id)).toEqual([
                seat.id,
            ]);

            await party.act(
                captain(party),
                "submitSelectedPlayers",
                team(party, 2, 0),
            );
            for (const i of all(party)) {
                if (i !== leaver) await party.act(i, "vote", true);
            }
            expect(party.phase(0)).toBe("voting");

            await party.replace(leaver, "Newcomer");
            expect(me(party, leaver).id).toBe(seat.id);
            expect(me(party, leaver).name).toBe("Newcomer");
            expect(me(party, leaver).isTraitor).toBe(seat.isTraitor);
            expect(round(party).disconnectedList).toHaveLength(0);

            await party.act(leaver, "vote", true);
            expect(party.phase(0)).toBe("voting_results");
            await party.close();
        });
    });
}
