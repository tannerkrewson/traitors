# Plan

Traitors is two hosted Nova games built from one codebase and served from
GitHub Pages at `https://www.tannerkrewson.com/traitors/`: Sabotage
(`game.html`, listed on Rocketcrab as `traitors`) and Banishment
(`game-banishment.html`, listed as `traitors-banishment`). `snakeout.tannerkrewson.com` 301s there through Cloudflare
redirect rules on the `tannerkrewson.com` zone.

# Deferred

- Retire the legacy Dokku app `snakeout` on the shared host. Nothing reaches
  it now that Cloudflare redirects the hostname at the edge. The DNS record
  must stay proxied for the redirect rules to apply, but it can point
  anywhere once the app is gone. `.local-build-artifacts/` holds its last
  1.7 GB image archive locally.
- Submit `https://www.tannerkrewson.com/traitors/sitemap.xml` in Google
  Search Console. `robots.txt` only works at the host root, which belongs to
  the `tannerkrewson.github.io` repo.
- Close PR #19, whose fix (the player list revealing the traitors) is in the
  Nova port.
- Rocketcrab's relay still lists a `spyfall-new` endpoint although Spyfall is
  a hosted Nova game now, and its Playwright e2e job fails on `main` in
  `connection-errors.spec.ts` and the party lobby spec, independent of the
  catalog changes.
