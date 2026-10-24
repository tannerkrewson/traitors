#!/usr/bin/env bash
# Requires exclusive shared-host slot. Uses existing trusted admin SSH access.
set -euo pipefail
[[ ${SNAKEOUT_DEPLOY_SLOT:-} == approved ]] || { echo "Set SNAKEOUT_DEPLOY_SLOT=approved only with coordinator slot." >&2; exit 1; }
artifacts=$(realpath "${1:?Usage: deploy-image.sh ARTIFACT_DIRECTORY [root@host]}")
host=${2:-root@134.209.222.77}
(cd "$artifacts" && sha256sum -c image.tar.sha256)
image=$(<"$artifacts/image.tag")
expected=$(<"$artifacts/image.id")
revision=$(<"$artifacts/source.commit")
[[ $image =~ ^localhost/snakeout:[a-f0-9]{40}$ ]]
[[ $expected =~ ^sha256:[a-f0-9]{64}$ && $revision =~ ^[a-f0-9]{40}$ ]]
archive_sha=$(sha256sum "$artifacts/image.tar" | cut -d " " -f 1)
archive_bytes=$(stat -c %s "$artifacts/image.tar")
# Archive + conservative expanded-layer allowance + 2 GiB reserve.
required=$((archive_bytes * 3 + 2147483648))
remote="/var/tmp/snakeout-image-${revision}-$(date -u +%Y%m%dT%H%M%SZ).tar"
ssh -o StrictHostKeyChecking=yes "$host" "test \"\$(df -B1 --output=avail /var/lib/docker | tail -1)\" -gt $required && test \"\$(awk '/MemAvailable:/ {print \$2}' /proc/meminfo)\" -gt 512000"
scp -o StrictHostKeyChecking=yes "$artifacts/image.tar" "$host:$remote"
ssh -o StrictHostKeyChecking=yes "$host" bash -s -- "$remote" "$archive_sha" "$image" "$expected" "$revision" <<'REMOTE'
set -euo pipefail
archive=$1; checksum=$2; image=$3; expected=$4; revision=$5
printf "%s  %s\n" "$checksum" "$archive" | sha256sum -c -
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="/root/snakeout-preimage-$stamp"
install -d -m 700 "$backup"
old=$(docker inspect --format '{{.Image}}' snakeout.web.1)
rollback="dokku/snakeout:rollback-$stamp"
docker tag "$old" "$rollback"
test "$(docker image inspect --format '{{.Id}}' "$rollback")" = "$old"
printf "%s\n" "$old" > "$backup/old-image.id"
printf "%s\n" "$rollback" > "$backup/rollback.tag"
printf "%s\n" "$revision" > "$backup/new-source.commit"
if git --git-dir=/home/dokku/snakeout show-ref --quiet; then
    git --git-dir=/home/dokku/snakeout bundle create "$backup/source.bundle" --all
    git --git-dir=/home/dokku/snakeout bundle verify "$backup/source.bundle"
else
    # Original app has empty bare refs. Save explicit non-secret source from the
    # running app instead. Never include .env, profile scripts, TLS or Dokku ENV.
    docker exec snakeout.web.1 tar -C /app -cf - src public package.json package-lock.json index.html vite.config.js README.md .github .babelrc .gitignore .prettierrc LICENSE .husky > "$backup/source.tar"
    tar -tf "$backup/source.tar" | grep -qx package.json
    tar -xOf "$backup/source.tar" package.json | sha256sum > "$backup/package.sha256"
    sha256sum "$backup/source.tar" > "$backup/source.tar.sha256"
    sha256sum -c "$backup/source.tar.sha256"
fi
docker load -i "$archive"
test "$(docker image inspect --format '{{.Id}}' "$image")" = "$expected"
test "$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image")" = "$revision"
# Dockerfile imports infer exposed port 5000 as an external port. Preserve the
# verified original Snakeout public mapping explicitly before changing images.
dokku ports:set snakeout http:80:5000 https:443:5000
if ! dokku git:from-image snakeout "$image"; then
    echo "Deploy failed; restoring $rollback (restores vulnerable runtime)." >&2
    dokku git:from-image snakeout "$rollback"
    exit 1
fi
printf "Loaded image: %s\nRollback reference: %s\nSource backup: %s\n" "$expected" "$rollback" "$backup"
rm -- "$archive"
REMOTE
# Immediately verify actual web runtime + public health, or roll back using the
# printed preserved tag. Successful command alone is NOT deployment validation.
