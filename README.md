# Traitors

#### Play now: [tannerkrewson.com/traitors](https://www.tannerkrewson.com/traitors/)

Free social deduction games for 3 to 10 players. Most players are Faithful;
a few are Traitors. Formerly known as Snakeout.

- **Sabotage**: pass three missions before the traitors sabotage them.
  Based on The Resistance.
- **Banishment**: banish the traitors before they murder everyone. Based on
  Mafia, with twists from the TV show.

## About

Each game runs as a hosted [Nova](https://rocketcrab.com) game: `game.html`
(Sabotage) and `game-banishment.html` (Banishment) each build to one
self-contained file that Rocketcrab loads into each player's party. They
share all of their code. The rules live in `src/game` and the React screens in `src/client`.
The landing and rules pages are static HTML, published with the game on
GitHub Pages.

## Quick start

```bash
npm install
npm run dev     # the site at http://localhost:5173/traitors/
npm test        # rules scenarios and a browser test of the built game
npm run build   # dist/ for GitHub Pages, including both game files
```

To try a change in a real party, upload a game file from `dist/` in the
[Rocketcrab editor](https://rocketcrab.com/editor) and add players in its
test arena.
