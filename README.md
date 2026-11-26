# Traitors

#### Play now: [tannerkrewson.com/traitors](https://www.tannerkrewson.com/traitors/)

A free social deduction game for 5 to 10 players, based on The Resistance.
Most players are Faithful; a few are Traitors who sabotage missions.
Formerly known as Snakeout.

## About

Traitors runs as a hosted [Nova](https://rocketcrab.com) game: `game.html`
builds to one self-contained file that Rocketcrab loads into each player's
party. The rules live in `src/game` and the React screens in `src/client`.
The landing and rules pages are static HTML, published with the game on
GitHub Pages.

## Quick start

```bash
npm install
npm run dev     # the site at http://localhost:5173/traitors/
npm test        # rules scenarios and a browser test of the built game
npm run build   # dist/ for GitHub Pages, including dist/game.html
```

To try a change in a real party, upload `dist/game.html` in the
[Rocketcrab editor](https://rocketcrab.com/editor) and add players in its
test arena.
