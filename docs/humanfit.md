# A player model: how likely one person is to find the engine's move

The coach wants to aim drills at positions where the engine knows a better move than the player sees. For that it
needs, for any position, the chance that *this* player makes each placement, fitted on their own device from a small
amount of their play, with nothing of any one person's play built in.

**Results on recorded human games are held back** until it is settled whose games they are and under what licence
they may be used and published (see "Results on human games" below). What is here is the model, the tools, and its
checks on synthetic players.

## The model

`src/human.wac`: per position, P(placement k) ∝ exp(β·Q_k/100 + w·φ_k), where Q_k is the points placement k scores
plus the self-taught network's value of the board it leaves, and φ_k fourteen readable facts about the placement. The
log-likelihood is concave in (β, w); Newton's method with step halving fits it, an L2 penalty pulling w towards 0
(weight 1) and β towards a prior of 1 (weight 0.01). With no moves the model is the prior, P ∝ exp(Q/100).

| Feature | Unit |
|---|---|
| holes made | change in empty cells under a filled one |
| landing height | mean height of the piece's cells, in 4 rows |
| max height change | in 2 rows |
| bumpiness change | sum of neighbouring columns' height differences, in 4 rows |
| single, double, triple, tetris | one each |
| blocks the well | a cell in the board's well (a column 3+ below both neighbours) without clearing |
| tuck or spin | a cell at or under its column's top: not a straight drop |
| wells made | change in columns 3+ below both neighbours |
| engine's top choice | the greedy engine's best placement |
| log gap to the best | log(1 + (Q_best − Q_k)/100) |
| greedy-best, not lookahead-best | the greedy best when one-piece lookahead prefers another |

## The data

`tools/humandata.wac` reads exports of games played in turbostack's original frontend (gzipped JSON, read with wac's
own `gzip` and `json` packages) and the coach page's JSON lines, and matches every recorded move to exactly one
placement of `board.placements(piece)`. Moves recorded twice are dropped; moves are linked to the move that left their
board, since some exports store them out of time order. The old frontend picked the placement whose cells' centre was
nearest the mouse; `tools/humanfit.wac` leaves out of every model's choices any placement that shares its centre with
an earlier one. **No human-game data is in this repository**, deliberately.

## The experiment

`tools/humanq.wac` values every placement by the self-taught greedy network (`g`), turbostack's model (`l`), and the
dual network's one-piece lookahead for the 8 best (`d`). `tools/humanfit.wac` holds out the last 8 games, fits
the first N moves before them, in the order played, and judges on the held-out games:
log-likelihood a move, top-1/top-3, and whether the expected loss it predicts, Σ P_k (Q_best − Q_k), picks out
where the player really lost: Spearman's ρ against the loss made, and the share of the biggest 5% of losses among
the 10% of positions it flags (10% by chance). `tools/humannet.wac` is the ceiling: the value network itself
fine-tuned as a softmax over each position's placements, every weight free, the epoch picked on the held-out games.
`tools/humanchart.wac` draws `curve.tsv`.

    wac run --allow-read --allow-write tools/humandata.wac human.txt turbostack-data-*.json.gz
    wac run --allow-read --allow-write tools/humanq.wac human.txt q.txt 0 10448 8    # in ranges, about 0.6 s a position
    wac run --allow-read --allow-write tools/humannet.wac human.txt <N> out/net-<N>.txt 32 3
    wac run --allow-read --allow-write tools/humanfit.wac human.txt q.txt out
    wac run --allow-read --allow-write tools/humanchart.wac out/curve.tsv chart.html

## Results on human games

*Held back.* The fit was run on one player's recorded games, and its results (fit quality against the number of moves,
and that player's fitted profile) are kept out of this repository until it is confirmed whose games they are and that
they may be published, and where the game exports came from and under what licence. They will go here then.

Method notes that do not depend on whose games they are:

- **β alone does not help** on real play: no single temperature fits a player who improves. What helps is the log
  gap to the best placement, which lets the model fall off as a near power law in the points lost rather than
  exponentially.
- **The penalty barely matters**: weights from 0.25 to 4 give the same curve within about 0.05 nats from 50 moves on;
  16 is too strong below 500 moves.
- **Lookahead Q** costs about 0.6 s a position on one core, against milliseconds for greedy values. Whether it helps
  has to be measured again: `tools/humanq.wac` had a bug in it (fixed in f005316; every placement outside lookahead's
  top k got a Q too low by the score so far), and it is not recorded whether the lookahead values used were made
  after the fix.
- **The neural ceiling** (`tools/humannet.wac`) picks its epoch on the held-out games, so it is optimistic.

### Synthetic players

Choices drawn on the same positions from known models, fitted the same way. The fit's held-out log-likelihood is
within 0.02 of the true model's by 500 moves for every in-family player, and its ρ and flagged share match the
truth's by 2,000.

- softmax(Q/200) and softmax(Q/800): β recovered (0.47 for 0.5, 0.13 for 0.125), other weights small.
  softmax(Q/50): β 2.6 for 2, with the log gap +1.0 taking up the difference — the two are near-collinear; its
  likelihood equals the truth's (−0.514 against −0.513).
- A heuristic player (no engine): holes −1.53, landing −0.98, bumpiness −1.00 for −1.5, −1, −1 by 500 moves; the
  rare ones less well even with all moves (tetris 1.15 for 2, blocks the well −0.8 for −1).
- Engine plus habits: a tuck aversion of −1.5 is invisible at 500 moves (−0.3) and found at 2,000 (−1.7): **rare
  habits take thousands of moves**, since few positions offer them.
- turbostack's model playing greedily is outside the family (log-likelihood −0.91 where it is deterministic); its
  profile against the self-taught engine is bumpiness −1.3, triples −1.2, holes −1.1.

### Time a fit takes

Newton from the prior, in wasm on V8 (the engine Chrome runs it on), on one CPU core: 0.7 ms at 25 moves, 16 ms at 500,
31 ms at 1,000, 131 ms at 2,000, about 360 ms at 7,700, 6–8 steps. Starting from the last fit, one more move takes 0.5, 7,
18, 32 and 105 ms. Per move in a browser it is cheap to about 2,000 moves; beyond that refit every few moves or keep a
window of recent ones (which also follows a player who improves).

## Caveats

- Recorded play from the old frontend: its mouse-nearest-centre picking (tucks may have been harder), an optional heat
  map of the AI's preferences and autoplay, none of which was recorded per move.
- The prior (β = 1, no features) is a guess, not a population: with many players it should be their average profile.
- The held-out games are a player's latest; if the player is improving, part of what N buys is catching up.
