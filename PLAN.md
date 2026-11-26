# Plan

Convert Snakeout into Traitors: a static, hosted Nova game on GitHub Pages at
`https://www.tannerkrewson.com/traitors/`.

1. Swap Prettier, Husky and tape for oxfmt, oxlint, lefthook and Vitest.
2. Characterization tests: scenarios written against a small driver, first
   run against the Express/Socket.IO server, later against the Nova handlers,
   so the same scenarios prove the port kept the rules.
3. Port to Nova. The rules in `src/server/app` become handlers over plain
   JSON state; `selectView` returns the `{ you, round }` payload the React
   components already render. Delete Express, Socket.IO, rooms, lobby and
   Dokku deployment.
4. Fix rules bugs: 10 players get 4 traitors; five rejected teams in a row
   lose the game; roles and mission votes stay secret (`selectView`); the
   player list order no longer reveals the traitors (PR #19).
5. Rebrand to the Traitors theme (Traitors and Faithful), replace Bootstrap
   with daisyUI and a custom candlelight theme, and redesign the screens that benefit.
6. SEO: static landing, how-to-play and comparison pages with metadata,
   structured data and GA4 (`G-02CH6EK1T2`).
7. Cut over: GitHub Pages, Rocketcrab catalog entry, Cloudflare 301 from
   `snakeout.tannerkrewson.com`.

# Deferred

- Retire the legacy Dokku app `snakeout` on the shared host once the
  redirect is verified.
