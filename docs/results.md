# Results

Every number is a mean final score over seeded 130-line games (mulberry32 piece sequences, `src/game.wac`), each
model playing the same games, so a difference is play and not luck. "±" is the standard error of the mean, or of the
mean per-game difference where two models are compared game by game.

## Greedy play: each piece where the model values the result most

Games 1 to 1,000.

| Model | Mean score | Games ending before 130 lines | Tetrises a game |
|---|---|---|---|
| turbostack's model (original TypeScript code) | **22,055 ± 192** | 33.4% | 15.9 |
| Self-taught, v5 iteration 88 | 19,167 ± 198 | 56.6% | 13.3 |

Game by game the self-taught model is 2,888 ± 255 behind, higher in 301 of the 1,000.

## With one piece of lookahead

Each model values its 3 best placements again: the mean, over the seven pieces that could come next, of the best
final score each then allows (`tools/evaluate.wac … 3`). Games 1 to 200.

| Model | Mean score | Games ending before 130 lines | Tetrises a game |
|---|---|---|---|
| turbostack's model, greedy (for reference) | 22,077 | — | — |
| Self-taught + lookahead | 24,703 ± 355 | 28.5% | 18.4 |
| turbostack's model + lookahead | **27,331 ± 225** | 14.0% | 20.8 |

Self-taught with lookahead beats turbostack's greedy play by 2,626 ± 506 a game; with both looking ahead, it is
2,628 ± 360 behind. The search helps both models about equally: the self-taught network is still the weaker one.

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
