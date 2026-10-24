# Snakeout deployment

Node is pinned to 22.23.4, which fixes CVE-2026-111497. Its Brotli version
still reports 1.1.0 because the fix is backported. Update the runtime pins together
in package.json, package-lock.json, mise.toml and CI when adopting later fixes.

## Build off-host

The shared production host has 2 GB RAM and no swap. Do not compile there.
The app-specific `.buildpacks` pins the official Node buildpack; the container
builder pins the exact existing herokuish base by digest. No host upgrade is needed.
`heroku-postbuild` compiles Vite before pruning dev dependencies; `Procfile` starts
the already-built app without recompiling. Existing npm start behavior is retained.

Commit reviewed changes, then on an amd64 workstation with Podman:

```sh
bash scripts/build-image.sh
# image: localhost/snakeout:<full git SHA>
```

Only committed files enter the build, not local .env files or credentials. Builds
share `/tmp/dokku-cve-offhost-build.lock` with the other apps. Run npm ci, npm test
(allow over 60 seconds for game timers), and npm run build:prod first. Validate the
image through `/start web` with NODE_ENV=production, a local published PORT, HTTP,
assets, valid Brotli requests and Socket.IO before deployment.

GitHub CI still tests pushes, but **master pushes no longer deploy**. The manual
`Build deployment image` workflow builds and exports an archive artifact off-host;
it does not deploy. It needs only GitHub contents read/artifact write capabilities,
not production secrets, registry credentials or a new paid service. Existing
PRIVATE_KEY is not consumed by this new path.

## Deploy (only with the shared-host coordinator slot)

Use existing trusted SSH access to root@134.209.222.77; never disable host-key checks.
Dokku 0.36.3 supports `git:from-image` for images already loaded on the host:
https://github.com/dokku/dokku/blob/v0.36.3/docs/deployment/methods/image.md
It creates a tiny FROM-only build, not an application/dependency build. Herokuish
process metadata and /start remain in the imported image. Dokku injects live app
environment at runtime; do not bake production configuration into the image.

1. Record container/image IDs, health of all four apps, free RAM/disk and current
   source. Preserve the current image with a unique `snakeout-rollback:<timestamp>`
   tag before importing anything. Do not prune it or any other app image.
2. Export the validated image with `podman save --format docker-archive IMAGE |
gzip > archive.tar.gz`. Record SHA256, copy over SSH, and verify the remote
   archive hash before `docker load`. Verify loaded image ID matches the local ID.
   Allow room for both archive and expanded new layers, retaining the old image.
3. `dokku git:from-image snakeout localhost/snakeout:<full git SHA>`.
   Do not also push code to Dokku. No extra dependency/frontend build should run.
4. Verify the actual running web container: Node v22.23.4, npm version, startup
   logs, no OOM/restart loop, public HTTPS/assets/stats/game creation/Socket.IO.
   Confirm the other app container IDs are unchanged and still running.
5. Delete only this deployment temporary archive after successful verification;
   retain the rollback reference. Never prune shared images as part of deployment.

If deployment fails, deploy the preserved image using `dokku git:from-image
snakeout snakeout-rollback:<timestamp>`, verify service, and stop. **That rollback
restores vulnerable Node 22.9.0.** A restart loses in-memory games; schedule and
report this brief disruption. Image imports give Dokku a synthetic Git commit;
use the image org.opencontainers.image.revision label for the real source SHA.
