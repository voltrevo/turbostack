#!/bin/sh
# Learn to play from nothing: iterations of play-and-target (four workers at once, one per core), then fit, with a
# check on fixed games every few iterations.
#
#     sh tools/train.sh <run-name> <config> <iterations> [boards-per-worker] [epsilon‰] [replay-iterations] [start-iteration] [λ‰] [bonus] [bonus-fades-by]
#
# Writes runs/<run-name>/: model-<i>.weights after iteration i, data-<i>-<w>.bin, and log.txt. Restartable: given a
# start iteration it continues from that iteration's model.
#
# METAL=1 runs every step on wac-tensor's Metal server, which must be running (`src/devices.wac`); WORKERS sets how many
# play at once (4 unless set) — on Metal they share the GPU, and what limits them is the CPU's share of play.
set -eu
cd "$(dirname "$0")/.."
run=$1; config=$2; iters=$3
boards=${4:-1500}; eps=${5:-100}; replay=${6:-4}; start=${7:-0}; lambda=${8:-}; bonus0=${9:-0}; fade=${10:-30}
dir=runs/$run
mkdir -p "$dir"
log="$dir/log.txt"
workers=${WORKERS:-4}
dev=""; net=""
if [ -n "${METAL:-}" ]; then dev=--metal; net=--allow-net; fi
i=$start
while [ "$i" -lt "$iters" ]; do
  model="$dir/model-$i.weights"
  [ -f "$model" ] || model=none
  t0=$(date +%s)
  # The survival bonus, falling in a straight line from bonus0 at the start to nothing at iteration `fade`.
  bonus=$(( bonus0 * (fade - i) / fade )); [ "$bonus" -lt 0 ] && bonus=0
  extra=""; [ -n "$lambda" ] && extra="$lambda $bonus"
  for w in $(seq 1 $workers); do
    wac run --allow-read --allow-write $net tools/gen.wac $dev "$config" "$model" $((i * 100 + w)) "$boards" "$eps" "$dir/data-$i-$w.bin" $extra &
  done
  wait
  files=""
  j=$((i - replay + 1)); [ "$j" -lt 0 ] && j=0
  while [ "$j" -le "$i" ]; do files="$files $(ls $dir/data-$j-*.bin)"; j=$((j + 1)); done
  fitted=$(wac run --allow-read --allow-write $net tools/fit.wac $dev "$config" "$model" "$dir/model-$((i + 1)).weights" ${EPOCHS:-4} $files)
  t1=$(date +%s)
  line="iteration $((i + 1)), bonus $bonus: $fitted ($((t1 - t0)) s)"
  if [ $(((i + 1) % ${EVAL_EVERY:-2})) -eq 0 ]; then
    score=$(wac run --allow-read $net tools/evaluate.wac $dev "$config" "$dir/model-$((i + 1)).weights" 1001 1020 | tail -1)
    line="$line; games 1001-1020: $score"
  fi
  echo "$line" | tee -a "$log"
  i=$((i + 1))
done
