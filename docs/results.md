# Results

Every number is a mean final score over seeded 130-line games (mulberry32 piece sequences, `src/game.wac`), each
model playing the same games, so a difference is play and not luck. "±" is the standard error of the mean, or of the
mean per-game difference where two models are compared game by game.

## Greedy play: each piece where the model values the result most

Games 1 to 1,000.

| Model | Mean score | Games ending before 130 lines | Tetrises a game |
|---|---|---|---|
| turbostack's model (original TypeScript code) | **22,055 ± 192** | 33.4% | 15.9 |
| Self-taught, v6 iteration 48 | **23,667 ± 168** | 29.0% | 17.4 |
| Self-taught, v5 iteration 88 (earlier) | 19,167 ± 198 | 56.6% | 13.3 |

Game by game the self-taught model (v6) is **1,612 ± 233 ahead**, higher in 597 of the 1,000. v5 was 2,888 ± 255
behind; v6 gained 4,500 ± 238 on it.

## With one piece of lookahead

Each model values its 3 best placements again: the mean, over the seven pieces that could come next, of the best
final score each then allows (`tools/evaluate.wac … 3`). Games 1 to 200.

| Model | Mean score | Games ending before 130 lines | Tetrises a game |
|---|---|---|---|
| turbostack's model, greedy (for reference) | 22,077 | — | — |
| Self-taught (v6) + lookahead | 26,603 ± 367 | 17.0% | 20.2 |
| Self-taught (v5) + lookahead | 24,703 ± 355 | 28.5% | 18.4 |
| turbostack's model + lookahead | **27,331 ± 225** | 14.0% | 20.8 |

With both looking ahead, the self-taught model (v6) is 728 ± 380 behind, higher in 97 of the 200 (v5 was 2,628 ± 360
behind). Lookahead adds about 5,300 to turbostack's model and 2,900 to the self-taught one: the self-taught network
plays better greedily but its values are less accurate a move further out.

## How the self-taught model learned

The full story, for re-implementing it: `docs/bootstrapping.md`.

From random weights, with no human games (`src/selfplay.wac`, `tools/train-pipe.sh`), run v5:

| Iteration | Mean score, games 1001–1020 | What changed |
|---|---|---|
| 4 | 322 | TD(λ) targets, a survival bonus of 40 a piece |
| 16 | 1,577 | clearing single lines, surviving ~120 pieces |
| 24 | 3,605 | wells in the starting boards (added from iteration 17) |
| 32 | 9,071 | survival bonus gone; tetrises appear |
| 44 | 15,546 | |
| 56 | 17,283 | exploration 5% → 1.5%, learning rate 0.001 → 0.0003 |
| 88 | 20,963 | (19,809 ± 588 over games 1001–1100) |

Run v6 continued from v5 iteration 88 with exact targets in place of TD(λ): λ-returns (λ = 0.5) over games the
network plays, each step's value the exact mean over the seven next pieces of the best placement's points plus value
(`tools/gen.wac … 500`), 5,000 boards an iteration with the last six iterations' kept, exploration 1.5%, learning rate 0.0001, no survival
bonus (`EPOCHS=2:1 sh tools/train-pipe.sh v6 standard 200 5000 15 6 0 500 0 1`). Noisy TD targets had been holding
the network back:

| Iteration | Mean score, games 1001–1100 |
|---|---|
| 0 (v5 iteration 88) | 19,809 ± 588 |
| 8 | 21,031 ± 605 |
| 16 | 22,707 ± 550 |
| 24 | 24,018 ± 460 |
| 40 | 24,575 ± 431 |
| 48 | **24,711 ± 416** |
| 56 | 24,161 ± 538 |

turbostack's model scores 23,318 ± 588 on these games.

## What did not help (yet)

After v6 the score stopped moving. Each of these started from v6 iteration 48 (24,711 ± 416 over games 1001–1100) and
was judged on the same games:

| Tried | Best check, games 1001–1100 | |
|---|---|---|
| v7: a third of the learning rate, 8,000 boards an iteration | 24,553 ± 497 | flat for 16 iterations |
| Mean of eight late checkpoints (`tools/average.wac`) | 24,773 ± 412 | +198 ± 538 against one checkpoint |
| Fitting fresh networks to the stored targets | 17,111 ± 757 | far behind: what the network knows is not all in the targets |
| v8: the network widened to twice the width (`tools/widen.wac`, `large`), which plays identically at first | 24,688 ± 588 | flat for 32 iterations, at about twice the cost |
| v9: self-play games played with lookahead (3), λ = 0.7, so the network learns the value of better play than its own | greedy 24,419 → 23,422; with lookahead on games 1–50, 28,618 at iteration 12 then 26,691 at 18 | worse by iteration 18 |

So more capacity and smoother training find nothing more in v6's targets, and the one attempt to teach the network
the value of searched play made it worse. The next things worth trying: lookahead used for the targets as well as the
moves, and a richer input (the board alone, without the next piece, is all the network sees).

## A second output: the value of play with lookahead

The `dual` network has two outputs: the greedy value, learned as before, and the value if play goes on with
lookahead. Lookahead chooses its candidates by the first and values the boards a piece deeper by the second. The
second output's target is that same search one level up: for each of the seven pieces, the best placement's estimate
by the dual player, exact over two pieces (`lookTargets`). Run v10 started from v6 copied into both outputs
(`tools/widen.wac standard … dual`), games played with lookahead, 3,000 boards an iteration with a third given
lookahead targets (`LOOK=3 EPOCHS=2:1 sh tools/train-pipe.sh v10 dual 200 3000 15 6 0 333 0 1`).

With lookahead (3 candidates), paired game by game:

| | Games | Mean score | Against v6 + lookahead | Against turbostack's model + lookahead |
|---|---|---|---|---|
| v10 iteration 24 | 1–200 | 27,246 ± 377 | +643 ± 438 | −85 ± 347 (27,331) |
| v10 iteration 36 | 1001–1100 | 29,278 | +1,618 ± 576, higher in 63 of 100 | — |
| **v10 iteration 36** | **1–200** | **28,590 ± 265** | **+1,987 ± 363**, higher in 138 | **+1,259 ± 294**, higher in 130 of 200 |

v10 iteration 36 (`models/self-taught-dual.weights`, `tools/evaluate.wac dual … 3`) finishes 170 of the 200 games
(85%) and makes 22.1 tetrises a game; turbostack's model with lookahead finishes 86% and makes 20.8.

Checks on games 1001–1050 alone ran from +858 to +2,850 against v6 and flattered whichever checkpoint was picked by
them: iteration 24, +2,596 there, was +643 on games 1–200.

**Playouts instead of the exact target did not help.** v11 continued from v10 iteration 36 with every board's
lookahead target the mean of 14 playouts of 3 moves, each move greedy by the second output, plus its value at the end
(`playoutTarget`; `PLAYOUTS="14 3"`). Those agree with the exact target to within 44 points RMS at 40% of the cost,
but the second output then chooses its own playouts' moves, and its error rose (116 → 237 over iterations 8–11). At
half the learning rate it held at about 150, and after 16 iterations in all it was 1,034 ± 660 behind v10 iteration
36 over games 1001–1100. Run v12 continued v10's exact targets from iteration 36 instead, and found nothing more:
28,695 at iteration 8 and 28,335 at 16 on games 1001–1100, against iteration 36's 29,278.

## Looking two pieces ahead at play time

`deepLook` takes the 3 best placements by the greedy output and values each as its points plus, averaged over the
seven next pieces, the best that one-piece lookahead (3 candidates, second output at the leaves) can then reach: the
same search as the training target. It is an option: `tools/evaluate.wac dual models/self-taught-dual.weights 1 200 3:2`.
It values about 7,300 boards a move, 14 times one-piece lookahead: roughly 2.5 seconds a move on one core. Finding
the placements is a small part of that, ~13 µs a piece; nearly all of it is the network.

Games 1–200, paired with the same pieces (`docs/runs/two-piece-games.txt`, against `docs/runs/one-piece-1-200.txt`
and `docs/runs/turbostack-one-piece-1-200.txt`):

| | Mean score | Two pieces ahead against it |
|---|---|---|
| **v10 iteration 36, two pieces ahead** | **29,008** | — |
| v10 iteration 36, one piece ahead | 28,590 | +418 ± 326, higher in 112 of 200 |
| turbostack's model, one piece ahead | 27,331 | +1,677 ± 285, higher in 144 of 200 |

The difference shrank as games came in — +795 ± 479 after 49, +506 ± 320 after 138 — and at 1.3 standard errors it is
not a clear win for 14 times the cost, so it is not on the duel page.

## A cheap filter for the deepest level (branch `filter`)

Nearly all of lookahead's work is valuing every placement of every next piece, only to take the best of each piece's
~23. A tiny network — the 200 cells and lines remaining, 128 hidden units, ~26,000 multiply-adds a board against the
full network's ~190,000 — is taught to rank one piece's placements as the second output does (`src/filter.wac`,
`tools/filter.wac`, `models/filter-128.weights`, from 40 games' 274,000 groups), and only its top few are valued by the
full network. Measured as how often the filtered search makes the same move as the unfiltered one on positions from
real games — a measure without the noise of whole games, in which one different move sends the game elsewhere:

| | Same move | Time a move |
|---|---|---|
| one-piece lookahead (3 candidates) | — | 164 ms |
| … filter keeping 2 of each piece's placements | 94.2% | 38 ms |
| … keeping 4 | 97.3% | 51 ms |
| … keeping 6 | 98.4% | 64 ms |
| two-piece lookahead (3:2) | — | 2,243 ms |
| … keeping 4 | 99.1% | 780 ms |
| … keeping 6 | 99.7% | 967 ms |

Against two-piece lookahead keeping 6 as the reference, one-piece lookahead makes the same move 94.9% of the time, and
more candidates do not bring it closer (5 or 8 candidates, filtered: 93–94%): the moves where one and two pieces ahead
differ are found by looking deeper, not wider.

**In whole games the filter is not free.** One-piece lookahead with the filter, paired against it unfiltered on games
1–200 (`docs/runs/filter-keep*-1-200.txt`; times under the same load, startup included):

| One-piece lookahead | Mean score | Against unfiltered (28,590) | Time a move |
|---|---|---|---|
| unfiltered | 28,590 | — | 160 ms |
| filter keeping 6 | 27,822 | −768 ± 289, higher in 81 of 200 | 73 ms |
| filter keeping 4 | 27,724 | −866 ± 281, higher in 85 of 200 | 61 ms |

It makes the same move 98% of the time, but the moves it changes cost far more than their share: the placements it
ranks wrongly are the unusual ones that matter. As it stands it is not for the duel page; keeping more, or a better
filter, would have to be measured in games again.

## Other ways to combine the seven pieces' outcomes (branch `risk`)

One-piece lookahead values a placement as the **mean**, over the seven pieces that could come next, of the best each
then allows. That is right for the average score if the network's values are right. Rules that weigh the bad outcomes
more could still help if the network underrated them, or offset the upward bias of taking the best of many noisy
estimates. They do not. Games 1–~60, paired against the mean (`docs/runs/risk-*.txt`,
`tools/evaluate.wac dual … 3 min|sd5|sd10|worst3`):

| Rule | Games | Mean score | Against the mean |
|---|---|---|---|
| the worst of the seven | 60 | 25,816 | −3,155 ± 611, higher in 11 |
| mean less one standard deviation | 61 | 26,383 | −2,628 ± 626, higher in 13 |
| mean of the worst three | 60 | 27,601 | −1,371 ± 614, higher in 22 |
| mean less half a standard deviation | 60 | 27,969 | −1,003 ± 391, higher in 18 |

The more pessimistic the rule, the worse it plays: the network's downside estimates are as good as its others.

## Different rules: seeing the next piece (a ceiling, branch `preview`)

**Not a candidate to replace anything.** Under the standard rules here the player knows only the current piece, which
models a person realistically: a person commits each piece's placement while it is still in the preview, so does not
really get the benefit of the piece after. These are different rules, where the next piece is known, and how much they
are worth is a ceiling, not a win.

**The pair search**: at each move, every placement of the current piece and, after each, every placement of the
next — about 23 × 23 boards — each valued as the points of both placements plus the ordinary network's value of the
board left (the network unchanged, told nothing of the pieces). The current piece goes where the best pair puts it;
the next piece is reconsidered on the following move, with the piece after it in view.
`tools/preview.wac pairs models/self-taught-dual.weights <from> <to> <output>`. About 162 ms a move, the cost of
one-piece lookahead.

Games 1–200, the same pieces (`docs/runs/preview-pairs-h*-1-200.txt`):

| Next piece known (different rules) | Mean score | Against one-piece lookahead (28,590) | Against two-piece lookahead (29,008) |
|---|---|---|---|
| pair search, leaves by the greedy output | **31,921** | +3,331 ± 263, higher in 172 of 200 | +2,913 ± 270, higher in 166 |
| pair search, leaves by the lookahead output | 31,914 | +3,324 ± 273, higher in 175 | +2,906 ± 281, higher in 167 |

The two outputs come to the same (+7 ± 156). It finishes 199 of the 200 games and makes 25.3 tetrises a game.

A first design gave the network the next piece as an input, a one-hot of seven, and trained it on its own play with
the preview; over 12 rounds its greedy play did not improve (25,420 → 24,596 on games 1001–1100), though it learned to
tell the pieces apart. The search alone, with the network as it is, is where the preview's worth is.

**Recalibrating the network for these rules did not clearly help.** A bounded pilot retrained the greedy output —
the one at the pair search's leaves, board-only as before — towards its value under the pair player: each board's
target the mean, over the seven next pieces each with a random piece after it, of the best pair's final score
(`tools/preview.wac pgen`, ~3,700 boards valued per target), 4,000 boards a round from the pair player's own games.
Paired against the unchanged network's pair search on held-out games 1001–1040 (32,026): round 1 +857 ± 406, round 2
+136 ± 433, its held-out error rising (109 → 232). Round 1 on 40 fresh games (1041–1080) was −91 ± 345; over all 80,
+383 ± 270, and the first 40 are the ones that picked it. So the pilot stopped there: the unchanged network serves the
search as well as one recalibrated this way.

## A probability filter for the deepest level (branch `pfilter`)

A second filter, redesigned to fix the first one's failure (it cut the I-piece replies that finish a tetris). Instead
of predicting each placement's value, it is a classifier over the placements of one piece on one board — a group:
one logit per placement, softmax over the group, trained by cross-entropy against the full network's choice
(T = 0), or against a softmax of the full network's values at temperature T. Its input is two planes — the board, and
a mask of the new piece's cells — plus the lines-remaining features, through a 4×3 convolution (6 channels) and a
16-unit hidden layer. At play time it cuts only the deepest level of one-piece lookahead: for each of the 7 pieces
after each of the top 3 candidates, it keeps placements in order of probability until their cumulative probability
reaches a threshold, plus any board that ends the game; optionally it never cuts a placement that clears lines.
`tools/pfilter.wac` (`gen`, `fit`, `screen`, `play`); weights `models/pfilter-t0.weights`, `models/pfilter-t50.weights`.

Trained on 274,050 groups from 40 greedy games (seeds 5002–5041), one epoch (a 4-way run was lost after epoch 1, and
epoch 1 already screened well). **Screen** on held-out seeds 9001–9004: 28,602 groups of ~23 placements, 1,339 whose
best placement is a tetris. Regret is the full network's value of the best placement less that of the best one kept
(`docs/runs/pfilter-screen.txt`):

| Filter | Kept a group | Mean regret | p99 regret | Tetris replies missed |
|---|---|---|---|---|
| T = 0, 0.95 | 3.6 | 1.8 | 57 | 4 of 1,339 |
| **T = 0, 0.99** | **5.3** | **0.4** | **0** | **0** |
| T = 0, 0.995 | 6.2 | 0.3 | 0 | 0 |
| T = 50, 0.95, never cut clears | 4.5 | 0.7 | 0 | 0 |
| T = 50, 0.99 | 6.4 | 0.2 | 0 | 0 |
| T = 150, 0.99 | 13.4 | 0 | 0 | 0 |
| T = 400, 0.99 | 21.3 | 0 | 0 | 0 |

T = 150 and 400 are too flat to cut much. **Whole games 1–200**, paired against unfiltered one-piece lookahead (28,590),
all under the same 4-way load (`docs/runs/pfilter-*-1-200.txt`; columns: seed, score, positions, lines, tetrises,
kept a group, ms a move):

| Player | Mean score | Against unfiltered | Same game | Tetrises a game | ms a move |
|---|---|---|---|---|---|
| unfiltered one-piece lookahead | 28,590 | — | — | 22.10 | 165 |
| **T = 0, 0.99** | **28,439** | **−151 ± 147** (17 higher, 21 lower) | 162 of 200 | 21.97 | **88** |
| T = 50, 0.95, never cut clears | 28,296 | −294 ± 180 (31 higher, 35 lower) | 134 of 200 | 21.84 | 83 |
| old filter, keep 6 (above) | 27,822 | −768 ± 289 | | 21.5 | 73 |

The unfiltered time is 12 games' wall clock (`docs/runs/pfilter-unfiltered-timing-1-12.txt`, process start
included, a few ms a move); the filtered times are measured inside the game. **T = 0 at 0.99 plays the same game as
unfiltered lookahead in 162 of 200, is statistically indistinguishable in score (−151 ± 147, about one standard
error), and takes 1.9 times less time a move.** It meets the bar for the duel page; it has not been switched.
