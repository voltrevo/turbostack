#!/bin/sh
# tools/train.sh, pipelined: while one core fits iteration i's network, three generate iteration i+1's games with the
# network before it — one iteration stale, as asynchronous self-play usually is — so the fit, which wac runs on one
# thread, no longer leaves three cores idle. An iteration takes as long as the slower of the two, not their sum.
#
#     EPOCHS=1:3 EVAL_EVERY=4 LOOK=0 sh tools/train-pipe.sh <run> <config> <iterations> <boards-per-iteration> <epsilon‰> \
#         <replay-iterations> <start-iteration> <λ‰ (negative for TD)> <bonus> <bonus-fades-by>
#
# Same files as train.sh — runs/<run>/model-<i>.weights, data-<i>-<w>.bin, log.txt — so either script continues the other.
set -eu
cd "$(dirname "$0")/.."
run=$1; config=$2; iters=$3; total=$4; eps=$5; replay=$6; start=$7; lambda=$8; bonus0=$9; fade=${10}
dir=runs/$run
mkdir -p "$dir"
log="$dir/log.txt"
workers=3
per=$(( (total + workers - 1) / workers ))

bonusAt() { b_v=$(( bonus0 * (fade - $1) / fade )); [ "$b_v" -lt 0 ] && b_v=0; echo $b_v; }

# Iteration g_it's games, made by `g_model`, on `g_n` workers. Its names are its own: a shell function shares the
# script's variables, and this one once overwrote the loop's `i`.
generate() {
  g_it=$1; g_model=$2; g_n=$3; g_each=$(( (total + g_n - 1) / g_n ))
  rm -f "$dir"/data-$g_it-*.bin
  g_pids=""
  for g_w in $(seq 1 $g_n); do
    wac run --allow-read --allow-write tools/gen.wac "$config" "$g_model" $((g_it * 100 + g_w)) "$g_each" "$eps" \
      "$dir/data-$g_it-$g_w.bin" "$lambda" "$(bonusAt $g_it)" ${LOOK:-0} &
    g_pids="$g_pids $!"
  done
  # Only the workers: `wait` alone would also wait for the fit running beside them.
  for g_p in $g_pids; do wait "$g_p"; done
}

modelOf() { if [ -f "$dir/model-$1.weights" ]; then echo "$dir/model-$1.weights"; else echo none; fi; }

i=$start
# The first iteration's games have no fit to overlap with: all four cores make them.
[ -n "$(ls "$dir"/data-$i-*.bin 2>/dev/null)" ] || generate $i "$(modelOf $i)" 4
while [ "$i" -lt "$iters" ]; do
  t0=$(date +%s)
  files=""
  j=$((i - replay + 1)); [ "$j" -lt 0 ] && j=0
  while [ "$j" -le "$i" ]; do files="$files $(ls $dir/data-$j-*.bin)"; j=$((j + 1)); done
  wac run --allow-read --allow-write tools/fit.wac "$config" "$(modelOf $i)" "$dir/model-$((i + 1)).weights" ${EPOCHS:-1} $files > "$dir/fit-$((i + 1)).txt" &
  fitPid=$!
  if [ $((i + 1)) -lt "$iters" ]; then generate $((i + 1)) "$(modelOf $i)" $workers; fi
  wait $fitPid
  t1=$(date +%s)
  line="iteration $((i + 1)), bonus $(bonusAt $i): $(cat "$dir/fit-$((i + 1)).txt") ($((t1 - t0)) s)"
  if [ $(((i + 1) % ${EVAL_EVERY:-4})) -eq 0 ]; then
    # In the background: the next iteration starts at once, and the check reports when it is done.
    m="$dir/model-$((i + 1)).weights"; k=$((i + 1))
    ( score=$(wac run --allow-read tools/evaluate.wac "$config" "$m" 1001 ${EVAL_TO:-1020} | tail -1)
      echo "check of iteration $k: games 1001-${EVAL_TO:-1020}: $score" | tee -a "$log" ) &
  fi
  echo "$line" | tee -a "$log"
  i=$((i + 1))
done
wait
