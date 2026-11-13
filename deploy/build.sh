#!/bin/sh
# The coach's release in dist/coach: the coach and about pages, the server built as a `wac app`, and the wac that runs
# it, so the machine it is deployed to needs node and nothing else — no wac install and no package cache.
#
#     sh deploy/build.sh
#
# The server is a project of its own (server/wac.json5) that builds with the wac this repository is worked with,
# `~/.wac/bin/wac`, or `$WAC` when set; it must be the wac at the commit server/wac.json5 pins (3e430f3).
set -eu
cd "$(dirname "$0")/.."
. "$HOME/.wac/env"
wac_bin="${WAC:-$HOME/.wac/bin/wac}"
sh tools/site.sh
out=dist/coach
rm -rf "$out"
mkdir -p "$out/bin"
cp dist/site/coach.html dist/site/about.html "$out/"
cp "$wac_bin" "$out/bin/wac"
(cd server && wac update >/dev/null && node "$wac_bin" app --allow-read --allow-write --allow-net --allow-env coach.wac -o "../$out/coach-server")
git rev-parse HEAD > "$out/VERSION"
echo "build: $out ($(cat "$out/VERSION"))"
