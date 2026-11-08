#!/bin/sh
# The pages site in dist/site: the duel page as index.html, beside the two models it loads, and — when there is one —
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
cp models/self-taught.weights models/turbostack.weights "$out/"
if [ $# -gt 0 ]; then printf '%s' "$1" > "$out/self-taught.txt"; fi
touch "$out/.nojekyll"
echo "site: $out"
