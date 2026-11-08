#!/bin/sh
# Learn to play from nothing: iterations of play-and-target (four workers at once, one per core), then fit, with a
# check on fixed games every few iterations.
#
#     sh tools/train.sh <run-name> <config> <iterations> [boards-per-worker] [epsilon‰] [replay-iterations] [start-iteration]
#
# Writes runs/<run-name>/: model-<i>.weights after iteration i, data-<i>-<w>.bin, and log.txt. Restartable: given a
# start iteration it continues from that iteration's model.
set -eu
cd "$(dirname "$0")/.."
run=$1; config=$2; iters=$3
boards=${4:-1500}; eps=${5:-100}; replay=${6:-4}; start=${7:-0}
dir=runs/$run
mkdir -p "$dir"
log="$dir/log.txt"
workers=4
i=$start
while [ "$i" -lt "$iters" ]; do
  model="$dir/model-$i.weights"
  [ -f "$model" ] || model=none
  t0=$(date +%s)
  for w in $(seq 1 $workers); do
    wac run --allow-read --allow-write tools/gen.wac "$config" "$model" $((i * 100 + w)) "$boards" "$eps" "$dir/data-$i-$w.bin" &
  done
  wait
  files=""
  j=$((i - replay + 1)); [ "$j" -lt 0 ] && j=0
  while [ "$j" -le "$i" ]; do files="$files $(ls $dir/data-$j-*.bin)"; j=$((j + 1)); done
  fitted=$(wac run --allow-read --allow-write tools/fit.wac "$config" "$model" "$dir/model-$((i + 1)).weights" 2 $files)
  t1=$(date +%s)
  line="iteration $((i + 1)): $fitted ($((t1 - t0)) s)"
  if [ $(((i + 1) % 2)) -eq 0 ]; then
    score=$(wac run --allow-read tools/evaluate.wac "$config" "$dir/model-$((i + 1)).weights" 1001 1020 | tail -1)
    line="$line; games 1001-1020: $score"
  fi
  echo "$line" | tee -a "$log"
  i=$((i + 1))
done
