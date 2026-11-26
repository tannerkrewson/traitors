// A stand-in for Nova that runs a whole party in this page: one human and
// some bots. It implements only what the game and its screens use.

export function createLocalParty(game, players, humanId) {
    let state = null;
    const views = new Set();
    const watchers = new Set();
    const starts = [];
    const human = players.find((player) => player.id === humanId);
    // a bot leads, so the demo never sends the game's analytics events
    const context = () => ({ players, leaderId: players[1].id });
    const view = () =>
        state && structuredClone(game.selectView(state, human, context()));

    function act(actor, type, payload) {
        const next = structuredClone(state);
        game.actions[type](next, { ...context(), actor }, payload);
        const prev = state;
        state = next;
        for (const listener of views) listener(view());
        for (const watcher of watchers) watcher(prev, state);
    }

    function start() {
        state = game.createInitialState(context());
        for (const listener of starts) listener();
        for (const watcher of watchers) watcher(null, state);
    }

    const nova = {
        player: human,
        players,
        leaderId: players[1].id,
        connectionStatus: "connected",
        defineGame() {},
        ready() {},
        onConnectionChange: () => () => {},
        onStart(listener) {
            starts.push(listener);
            return () => {};
        },
        state: {
            get: view,
            onChange(listener) {
                views.add(listener);
                return () => views.delete(listener);
            },
        },
        async dispatch({ type, payload }) {
            act(human, type, payload);
        },
    };

    return {
        nova,
        start,
        act,
        state: () => state,
        // called with (previous state, new state) after every change
        watch(watcher) {
            watchers.add(watcher);
        },
    };
}
