#!/bin/sh
# Deploys the coach: builds the release (deploy/build.sh), copies it to the machine as a new release beside the old
# ones, points /opt/coach/current at it, restarts the server and checks it answers. Keeps the last five releases.
#
#     sh deploy/deploy.sh <ssh target> [--setup <domain>]
#
# `<ssh target>` is root@<host>, or an alias in ~/.ssh/config. `--setup <domain>` first prepares a fresh machine
# (deploy/setup.sh). To go back a release, on the machine:
#
#     ln -sfn /opt/coach/releases/<commit> /opt/coach/current && systemctl restart coach
set -eu
cd "$(dirname "$0")/.."
target=${1:?usage: deploy.sh <ssh target> [--setup <domain>]}
shift
if [ "${1:-}" = "--setup" ]; then
  domain=${2:?usage: deploy.sh <ssh target> --setup <domain>}
  rsync -a --delete deploy/ "$target:/root/coach-deploy/"
  ssh "$target" "sh /root/coach-deploy/setup.sh '$domain'"
fi
sh deploy/build.sh
version=$(cat dist/coach/VERSION)
ssh "$target" "mkdir -p /opt/coach/releases/$version"
rsync -a --delete dist/coach/ "$target:/opt/coach/releases/$version/"
ssh "$target" "set -e
  chown -R root:root /opt/coach/releases/$version && chmod -R go-w /opt/coach/releases/$version
  ln -sfn /opt/coach/releases/$version /opt/coach/current
  systemctl restart coach
  for i in 1 2 3 4 5 6 7 8 9 10; do curl -fsS http://127.0.0.1:8080/health && break; sleep 1; done
  ls -1dt /opt/coach/releases/* | tail -n +6 | xargs -r rm -rf"
echo
echo "deploy: $version is live on $target"
