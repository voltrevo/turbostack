#!/bin/sh
# Trains the preview model: rounds of self-play with the preview and fitting, resumable — a finished round's weights
# are kept and skipped on a restart.
#
#     sh tools/train-preview.sh <dir> <start.weights> <rounds> [boards per worker] [epsilon‰] [look]
#
# Every round: 4 workers each play to <boards> boards (`tools/preview.wac gen`), then the network is fitted for 2 epochs
# at a tenth of Adam's usual rate to the last three rounds' boards. Every 4th round it plays the games of seeds
# 1001-1100 greedily with the preview, into <dir>/check-<round>.txt.
set -eu
. ~/.wac/env
cd "$(dirname "$0")/.."
dir=$1; start=$2; rounds=$3; boards=${4:-3000}; eps=${5:-20}; look=${6:-0}
mkdir -p "$dir"
[ -s "$dir/model-0.weights" ] || cp "$start" "$dir/model-0.weights"
for i in $(seq 1 "$rounds"); do
  prev="$dir/model-$((i-1)).weights"
  [ -s "$dir/model-$i.weights" ] && continue
  for w in 1 2 3 4; do
    f="$dir/data-$i-$w.bin"
    [ -s "$f" ] || wac run --allow-read --allow-write tools/preview.wac gen "$prev" $((i*10+w)) "$boards" "$eps" "$look" "$f.tmp" && mv "$f.tmp" "$f" &
  done
  wait
  data=""
  for j in $i $((i-1)) $((i-2)); do [ "$j" -ge 1 ] && data="$data $(ls $dir/data-$j-*.bin)"; done
  wac run --allow-read --allow-write tools/fit.wac preview "$prev" "$dir/model-$i.tmp" 2:1 $data 2>&1 | tail -1 | sed "s/^/round $i /"
  mv "$dir/model-$i.tmp" "$dir/model-$i.weights"
  if [ $((i % 4)) -eq 0 ]; then
    wac run --allow-read tools/preview.wac eval "$dir/model-$i.weights" 1001 1100 0 > "$dir/check-$i.txt" 2>&1
    echo "round $i check: $(tail -1 $dir/check-$i.txt)"
  fi
done
echo "training done"
