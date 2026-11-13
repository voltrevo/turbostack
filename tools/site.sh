#!/bin/sh
# The pages site in dist/site: the duel page as index.html and the coach as coach.html, beside the models they load, and — when there is one —
# `self-taught.txt`, the self-taught model's measured mean score, which the page shows.
#
#     sh tools/site.sh [self-taught mean score text]
set -eu
cd "$(dirname "$0")/.."
out=dist/site
rm -rf "$out"
mkdir -p "$out"
wac run --allow-read --allow-write --allow-run tools/build.wac web/play.wac dist/site-play --title "Tetris, learned from nothing"
cp dist/site-play/index.html "$out/index.html"
# The coach carries its model's weights, so the one file works anywhere, and keeps your moves in the browser's own
# storage, so it is granted files.
wac run --allow-read --allow-write tools/embed.wac models/self-taught-dual.weights web/dualweights.wac dualWeights
wac run --allow-read --allow-write --allow-run tools/build.wac web/coach.wac dist/site-coach --title "turbostack coach" --grant read,write
cp dist/site-coach/index.html "$out/coach.html"
wac run --allow-write web/about.wac "$out/about.html"
cp models/self-taught.weights models/self-taught-dual.weights models/turbostack.weights "$out/"
if [ $# -gt 0 ]; then printf '%s' "$1" > "$out/self-taught.txt"; fi
touch "$out/.nojekyll"
echo "site: $out"
