# Resumes the paired two-piece lookahead evaluation (games 1-200): plays every seed not yet in
# docs/runs/two-piece-games.txt, 4 at a time, one process per game, appending each result as it finishes, so it can be
# stopped and resumed at any point. Then prints the paired comparison. Run from the repository root:
#     nohup sh tools/resume-two-piece.sh > two-piece.log 2>&1 &
. ~/.wac/env
R=docs/runs/two-piece-games.txt
todo=""
for s in $(seq 1 200); do grep -q "^$s " $R || todo="$todo $s"; done
worker() {
  i=0
  for s in $todo; do
    i=$((i+1)); [ $((i % 4)) -ne $1 ] && continue
    line=$(wac run --allow-read tools/evaluate.wac dual models/self-taught-dual.weights $s $s 3:2 2>&1 | grep -E '^[0-9]+ ')
    [ -n "$line" ] && echo "$line" >> $R && echo "game $line"
  done
}
for w in 0 1 2 3; do worker $w & done
wait
sort -n -o $R $R
for ref in docs/runs/one-piece-1-200.txt docs/runs/turbostack-one-piece-1-200.txt; do
  awk -v R=$ref 'FNR==NR{a[$1]=$2;next} ($1 in a){d=a[$1]-$2; n++; s+=d; ss+=d*d; if(d>0)w++} END{m=s/n; printf "two-piece vs %s: %d games, %+.0f ± %.0f, higher in %d\n", R, n, m, sqrt((ss/n-m*m)*n/(n-1))/sqrt(n), w}' $R $ref
done
