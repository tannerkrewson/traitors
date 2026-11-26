import { describe, expect, it } from "vitest";
import { Banishment } from "../game/banishment.js";
import { Player } from "../game/player.js";
import { banishmentGame } from "../game/game.js";

// a table of n seats (ids 1..n) with the given seats as traitors
function table(n, traitors) {
    const players = Array.from({ length: n }, (_, i) =>
        Player("P" + (i + 1), "p" + (i + 1), i + 1),
    );
    const round = Banishment(1, players);
    for (const player of players)
        player.isTraitor = traitors.includes(player.id);
    everyoneDone(round);
    return round;
}
const seat = (round, id) => round.players.find((player) => player.id === id);
function everyoneDone(round) {
    for (const id of round.playersBeingWaitedOn.slice()) {
        Banishment.done(round, seat(round, id), round.phase);
    }
}
// voters -> target, with everyone else voting for `rest`
function vote(round, targets, rest) {
    for (const id of round.playersBeingWaitedOn.slice()) {
        const target = targets[id] ?? (rest === id ? targets.other : rest);
        Banishment.banishVote(round, seat(round, id), target);
    }
}
function night(round, target) {
    for (const id of round.playersBeingWaitedOn.slice()) {
        Banishment.nightPick(round, seat(round, id), target);
    }
}
const view = (round, partyId) =>
    banishmentGame.selectView(
        { players: [], mode: "banishment", round },
        { id: partyId },
    ).round;

describe("banishment", () => {
    it("deals 1 traitor to 5 or 6 players, 2 to 7 to 9, and 3 to 10", () => {
        for (const [n, traitors] of [
            [5, 1],
            [6, 1],
            [7, 2],
            [9, 2],
            [10, 3],
        ]) {
            const players = Array.from({ length: n }, (_, i) =>
                Player("P", "p" + i, i + 1),
            );
            const round = Banishment(1, players);
            expect(round.players.filter((p) => p.isTraitor)).toHaveLength(
                traitors,
            );
            expect(round.phase).toBe("start");
        }
    });

    it("banishes the most voted player and reveals their role", () => {
        const round = table(6, [1]);
        expect(round.phase).toBe("round_table");
        vote(round, { 1: 2 }, 1);
        expect(round.phase).toBe("banishment");
        expect(seat(round, 1).alive).toBe(false);
        expect(view(round, "p3").banished).toMatchObject({
            id: 1,
            isTraitor: true,
        });
        expect(view(round, "p3").lastVotes).toHaveLength(6);
        everyoneDone(round);
        expect(round.winner).toBe("faithful");
        expect(round.phase).toBe("final");
    });

    it("revotes a tie once, then banishes nobody", () => {
        const round = table(6, [1]);
        vote(round, { 1: 2, 2: 1, 3: 1, 4: 2, 5: 1, 6: 2 });
        expect(round.phase).toBe("round_table");
        expect(round.candidates).toEqual([1, 2]);
        vote(round, { 1: 2, 2: 1, 3: 1, 4: 2, 5: 1, 6: 2 });
        expect(round.phase).toBe("banishment");
        expect(round.banished).toBeNull();
        everyoneDone(round);
        expect(round.phase).toBe("night");
    });

    it("lets the traitors murder a faithful player at night", () => {
        const round = table(6, [1]);
        vote(round, { 1: 2, other: 2 }, 3);
        everyoneDone(round);
        expect(round.phase).toBe("night");
        expect(round.playersBeingWaitedOn).toEqual([1]);
        expect(() => Banishment.nightPick(round, seat(round, 2), 4)).toThrow();
        night(round, 4);
        expect(round.phase).toBe("morning");
        expect(round.day).toBe(2);
        expect(view(round, "p2").murdered).toMatchObject({ id: 4 });
    });

    it("recruits instead of murdering after a traitor is banished", () => {
        const round = table(8, [1, 2]);
        vote(round, { 1: 3 }, 1);
        everyoneDone(round);
        expect(round.recruiting).toBe(true);
        night(round, 5);
        expect(seat(round, 5).isTraitor).toBe(true);
        expect(seat(round, 5).alive).toBe(true);
        expect(view(round, "p5").recruited).toMatchObject({ id: 5 });
        expect(view(round, "p4").recruited).toBeNull();
        expect(view(round, "p4").murdered).toBeNull();
    });

    // day 1 banishes faithful seat 2, night 1 murders seat 3
    function toEndgame() {
        const round = table(5, [1]);
        vote(round, { other: 3 }, 2);
        everyoneDone(round);
        night(round, 3);
        everyoneDone(round);
        return round;
    }

    it("holds an endgame vote once four or fewer remain", () => {
        const round = toEndgame();
        expect(round.phase).toBe("endgame");
        for (const [id, end] of [
            [1, true],
            [4, true],
            [5, false],
        ]) {
            Banishment.endgameVote(round, seat(round, id), end);
        }
        // one holdout keeps the game going
        expect(round.phase).toBe("round_table");
        expect(round.lastEndVotes).toEqual({ end: 2, banish: 1 });
        vote(round, { 1: 4 }, 1);
        everyoneDone(round);
        expect(round.winner).toBe("faithful");
    });

    it("gives a unanimous endgame to any traitor still in", () => {
        const round = toEndgame();
        for (const id of [1, 4, 5]) {
            Banishment.endgameVote(round, seat(round, id), true);
        }
        expect(round.winner).toBe("traitor");
        expect(round.phase).toBe("final");
    });

    it("lets the traitors win once they can't be outvoted", () => {
        const round = table(7, [1, 2]);
        vote(round, { 1: 3, 2: 3, other: 4 }, 3);
        everyoneDone(round);
        night(round, 4);
        everyoneDone(round);
        // 5 remain: 2 traitors, 3 faithful
        vote(round, { 1: 5, 2: 5, other: 6 }, 5);
        everyoneDone(round);
        expect(round.winner).toBe("traitor");
    });

    it("shows roles only to traitors, the eliminated and everyone at the end", () => {
        const round = table(6, [1]);
        const traitorsSeenBy = (partyId) =>
            view(round, partyId).players.filter((p) => p.isTraitor).length;
        expect(traitorsSeenBy("p1")).toBe(1);
        expect(traitorsSeenBy("p2")).toBe(0);
        // votes stay secret until everyone has voted
        Banishment.banishVote(round, seat(round, 2), 3);
        expect(view(round, "p4").lastVotes).toHaveLength(0);
        expect(view(round, "p2").myVote).toMatchObject({ id: 3 });
        vote(round, { 3: 4 }, 3);
        expect(traitorsSeenBy("p3")).toBe(1);
        expect(traitorsSeenBy("p4")).toBe(0);
    });
});
