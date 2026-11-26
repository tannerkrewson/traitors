import { afterEach, expect, test, vi } from "vitest";
import source from "../../dist/game.html?raw";

// Plays the built Nova file in five frames, with a stand-in for Nova that
// runs the handlers the game registers.

const players = ["<img src=x onerror=alert(1)>", "Bo", "Cy", "Di", "Ed"].map(
    (name, i) => ({ id: `p${i}`, name }),
);
const frames = [];

afterEach(() => {
    for (const frame of frames.splice(0)) frame.remove();
    delete window.traitorsTestNova;
});

async function party() {
    let definition;
    let state = null;
    const context = { players, leaderId: players[0].id };
    const clients = [];
    const ready = [];

    const view = (i) =>
        structuredClone(definition.selectView(state, players[i], context));
    const broadcast = () =>
        clients.forEach((client, i) => client.render(view(i)));

    window.traitorsTestNova = (index) => {
        const client = { render: () => {}, started: () => {} };
        clients[index] = client;
        const noop = () => () => {};
        return {
            defineGame: (game) => (definition ??= game),
            ready: () => ready[index](),
            player: players[index],
            players,
            leaderId: context.leaderId,
            connectionStatus: "connected",
            onConnectionChange: noop,
            onStart(callback) {
                client.started = callback;
                return () => {};
            },
            state: {
                get: () => (state ? view(index) : null),
                onChange(callback) {
                    client.render = callback;
                    return () => {};
                },
            },
            async dispatch({ type, payload }) {
                const next = structuredClone(state);
                definition.actions[type](
                    next,
                    { ...context, actor: players[index] },
                    payload,
                );
                state = next;
                broadcast();
            },
        };
    };

    const documents = await Promise.all(
        players.map((_, index) => {
            const frame = document.createElement("iframe");
            frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
            frame.width = "390";
            frame.height = "900";
            frame.srcdoc = source
                .replace(/<script[^>]*googletagmanager[^>]*><\/script>/, "")
                .replace(
                    "<head>",
                    `<head><script>window.nova = parent.traitorsTestNova(${index})</script>`,
                );
            frames.push(frame);
            document.body.append(frame);
            return new Promise((resolve) => {
                ready[index] = () => resolve(frame.contentDocument);
            });
        }),
    );

    return {
        documents,
        start() {
            state = definition.createInitialState(context);
            clients.forEach((client) => client.started());
        },
        state: () => state,
    };
}

const text = (doc) => doc.body.textContent;
const button = (doc, label) =>
    vi.waitFor(() => {
        const found = [...doc.querySelectorAll("button")].find((b) =>
            b.textContent.includes(label),
        );
        if (!found) throw new Error(`No "${label}" button`);
        return found;
    });
const click = async (doc, label) => (await button(doc, label)).click();
const see = (doc, pattern) =>
    vi.waitFor(() => expect(text(doc)).toMatch(pattern));

test("plays a mission from the role reveal to the results", async () => {
    const session = await party();
    const { documents } = session;
    await see(documents[0], /waiting for the game to start/i);

    session.start();
    for (const doc of documents) {
        expect(doc.querySelector("img")).toBeNull();
        await click(doc, "Begin");
    }

    const seats = session.state().round.players;
    const captain = seats.findIndex((seat) => seat.isCaptain);
    const captainDoc = documents[captain];
    await see(captainDoc, /you are captain/i);
    const picked = (n) =>
        vi.waitFor(() =>
            expect(session.state().round.captainsSelectedPlayers).toHaveLength(
                n,
            ),
        );
    await click(captainDoc, players[1].name);
    await picked(1);
    await click(captainDoc, players[2].name);
    await picked(2);
    for (const doc of documents) await see(doc, /Bo/);
    await click(captainDoc, "Put it to a vote");

    for (const doc of documents) await click(doc, "Approve");
    for (const doc of documents) await click(doc, "Next");

    for (const i of [1, 2]) await click(documents[i], "Pass");
    for (const doc of documents) await click(doc, "Next");
    for (const doc of documents) {
        await see(doc, /mission 1 passed/i);
        await see(doc, /2 pass votes/);
    }
});

test("only shows who the other traitors are to the traitors", async () => {
    const session = await party();
    session.start();
    const seats = session.state().round.players;
    const traitors = seats.filter((seat) => seat.isTraitor);
    for (const [i, doc] of session.documents.entries()) {
        const other = traitors.find((seat) => seat.partyId !== players[i].id);
        const isTraitor = seats.find(
            (s) => s.partyId === players[i].id,
        ).isTraitor;
        const reveal = await button(doc, "view your role");
        reveal.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        const role = await vi.waitFor(
            () => doc.querySelector(".popover-body").textContent,
        );
        expect(role.includes(other.name)).toBe(isTraitor);
    }
});
