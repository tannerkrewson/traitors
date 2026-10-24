#!/usr/bin/env bash
set -euo pipefail
# Build only committed source; never copy local .env, credentials or node_modules.
engine=${CONTAINER_ENGINE:-podman}
revision=$(git rev-parse HEAD)
image=${1:-localhost/snakeout:$revision}
context=$(mktemp -d)
trap 'rm -rf "$context"' EXIT
mkdir "$context/app"
git archive HEAD | tar -x -C "$context/app"
cat > "$context/Containerfile" <<EOF
FROM docker.io/gliderlabs/herokuish@sha256:475ba6ea9eaa02934eb694d842c61adcdd49a564f4003aa45dc6a81b276a7b74
COPY app/ /app/
RUN /bin/herokuish buildpack build
LABEL org.opencontainers.image.revision=$revision
EXPOSE 5000
ENTRYPOINT ["/start"]
CMD ["web"]
EOF
# Shared with other apps on this workstation; held for the full heavy build.
format_args=()
if [[ "$engine" == "podman" ]]; then format_args=(--format docker); fi
flock /tmp/dokku-cve-offhost-build.lock "$engine" build "${format_args[@]}" -f "$context/Containerfile" -t "$image" "$context"
printf 'Built %s from %s\n' "$image" "$revision"
