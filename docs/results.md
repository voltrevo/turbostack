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

From random weights, with no human games (`src/selfplay.wac`, `tools/train-pipe.sh`), run v5:

| Iteration | Mean score, games 1001–1020 | What changed |
|---|---|---|
| 4 | 322 | TD(λ) targets, a survival bonus of 40 a piece |
| 16 | 1,577 | clearing single lines, surviving ~120 pieces |
| 24 | 3,605 | wells added to the starting boards |
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
same search as the training target. It is an option: `tools/evaluate.wac dual models/self-taught-dual.weights 1 49 3:2`.
It costs about 14 times one-piece lookahead, roughly 2.5 seconds a move on one CPU core (14 minutes a game).

Games 1–49, paired with the same pieces:

| | Mean score | Two pieces ahead against it |
|---|---|---|
| **v10 iteration 36, two pieces ahead** | **29,893 ± 412** | — |
| v10 iteration 36, one piece ahead | 29,098 | +795 ± 479, higher in 29 of 49 |
| turbostack's model, one piece ahead | 27,679 | +2,214 ± 502, higher in 36 of 49 |

It is probably better than one piece ahead, but 1.7 standard errors is not a clear win for its cost, so it is not
on the duel page.
