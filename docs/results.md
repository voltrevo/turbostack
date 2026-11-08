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
