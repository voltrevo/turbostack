# Bootstrapping: how the self-taught model got off the ground

How a value network learned to play turbostack's game from random weights, with no human games and no hand-made
features — and in particular how it came to build wells and make tetrises. Written so the training can be
re-implemented in another framework (PyTorch, JAX); the wac code is the reference (`src/value.wac`,
`src/selfplay.wac`, `tools/gen.wac`, `tools/fit.wac`, `tools/train.sh`, `tools/train-pipe.sh`).

**Sources.** The run logs survive (`runs/v1.out` … `runs/v6.out`, which git ignores), as does every v5 checkpoint. The
per-iteration tetris and line counts below were re-measured from those checkpoints for this note — greedy play is
deterministic, and the re-measured scores equal the logged ones exactly. The command lines are from the session
transcript. What is reconstructed or interpretation rather than logged is marked as such.

## 1. The setup

### The game (turbostack's rules, `src/board.wac`)

- 20 rows × 10 columns. Seven pieces, each equally likely, drawn from mulberry32 seeded per game (`src/game.wac`).
  No preview of the next piece, no hold.
- **Placements**: wherever the piece, in any rotation, can be dropped straight down to rest; plus where one rotation
  either way or a one-column shift from a resting place fits (a crude tuck or spin). Typically ~10–35 placements a
  piece. The placement list is in a fixed order and ties go to the first, which matters only for exact replication.
- **Scoring**: clearing 1, 2, 3 or 4 lines at once scores 40, 100, 300, 1,200 (level-0 NES scoring, at every level).
  A tetris pays 7.5 times what four singles do — the whole game's strategy hangs on that ratio.
- **The game ends** when `linesMax` lines have been cleared (130 for a real game), when a placement leaves any column
  taller than 15 (the top five rows are forbidden), or when a piece has nowhere to go. Score is points only.

### The network (`ValueConfig.standard()`, `src/value.wac`)

It values a board **after a piece has landed and lines have cleared**, as the **points still to come** — not the final
score (it would then have to learn the score so far, which it is handed).

- **Board input**: the 20×10 cells as 0/1, padded with walls and a floor of 1s to **21×12** (one channel).
- **Conv**: 4×3 kernel, 16 channels, valid padding → 18×10×16, leaky ReLU (0.01).
- From there, two branches:
  - **Rows**: a 1×10 conv over the full width, 24 channels → 18×1×24, leaky ReLU. One summary per row: how full it is
    and where its gaps are.
  - **Columns**: an 18×1 conv over the full height, 16 channels → 1×10×16, leaky ReLU. One summary per column: how
    tall it is and what is buried in it.
- **Lines-remaining features** (3 numbers): `r/130`, `min(r,10)/10`, and `1 if r ≤ 4 else 0`, where `r = linesMax −
  linesCleared`.
- **Dense layers**: concat(432 + 160 + 3 = 595) → 64 leaky ReLU → 64 leaky ReLU **plus a skip from the first 64** → 1.
- **Output** in thousands of points (targets are divided by 1,000 before the loss). About 190k multiply-adds a board.
- **Init**: Glorot uniform for kernels; zeros for biases and for the output layer, so an untrained network values
  every board at 0.
- A finished board (game over) is worth 0 whatever the network says. This is enforced outside the network, in play
  and in targets.

v1–v4 used `small`, half the width throughout (conv 8, rows 16, cols 8, hidden 32).

### Move choice

Greedy: for each placement of the current piece, `points that placement scores + V(board it leaves)`, and take the
largest. Lookahead and the second output came much later and are not part of bootstrapping.

### Training loop (`tools/train.sh`)

Each iteration:
1. Four workers (one per core) play games with the current network and write `(board, target)` examples.
2. One process fits the network for one pass over the examples from the last `replay` iterations, continuing from the
   current weights.

Every few iterations, greedy play on **fixed games 1001–1020** is the check. `train-pipe.sh` later overlapped the fit
of iteration i with the generation of i+1 using the previous network, one iteration stale.

**Fitting (`tools/fit.wac`)**:
- MSE on targets divided by 1,000, Adam, batch 256.
- Learning rate 0.001 unless set otherwise.
- The data is shuffled, and 1/20 is held out and only measured.

**Where training games start**: each game picks its length `linesMax` uniformly from 1–130, and 30% of the time 130
outright. The network therefore sees every number of lines remaining, and short games teach it how to finish. Value
then flows backwards through the lines-remaining input, from "three lines to go" towards "130 to go". Starting boards
are covered in section 4.

## 2. The dead ends, v1–v4

All four used the small network, 6,000 boards an iteration (1,500 per worker × 4) and Adam at 0.001. Each was judged
by greedy play on games 1001–1020; for reference, v5 later reached 20,963 on these games and v6 24,711 on 1001–1100.

| Run | What it added | Command (`train.sh` args) | Check score over iterations | Why it stalled |
|---|---|---|---|---|
| v1 | exact one-step targets | `v1 small 40 1500 100 4` — ε 10%, replay 4 | 46 → 66 (it. 2, 4) | value moves back one piece per iteration; a game is ~340 pieces |
| v2 | λ-returns, λ = 0.95 | `v2 small 60 1500 50 3 0 950` — ε 5%, replay 3 | 92 → 130 (it. 2, 4) | a beginner never clears a line, so no outcome to learn from |
| v3 | + rubble starting boards | same as v2 | 52, 71, 85, 61 (it. 2–8) | clears are seen, but topping out costs a beginner nothing it expected to score |
| v4 | + survival bonus 40 a piece, fading to 0 by iteration 30 | `v4 small 60 1500 50 3 0 950 40 30` | 96, 227, 212, 139, 227 (it. 2–10) | games got longer, then flat at ~220 |

- **v1, exact one-step targets.** Each board's target is the mean over the 7 next pieces of
  `max over placements (points + V(child))`, with V from the current network and a finished child worth 0. There is
  no sampling noise, but information moves back exactly one piece per iteration. Scores are tens of points: the
  network sees almost no line clears. Training error was ~4 points, because nearly every target is ~0.
- **v2, λ-returns** (`examplesFromPlay`):

  `G(t) = (1 − λ)·T(t) + λ·(points(t+1) + G(t+1))`

  T is the exact one-step target above. The chain is cut at a random exploring move, where G(t) = T(t). Real outcomes
  now reach every board, but from an empty board a random-ish player tops out long before completing a row. There is
  no reward anywhere to propagate.
- **v3, rubble starts.** Half the training games start from up to 10 rows of rubble (section 4), so a line clear is
  often a piece or two away, and the network did learn that clears pay. Still flat (52–85).
  - *Interpretation*: a beginner's value of any board is ~0, so topping out loses nothing it expected. There is no
    gradient towards survival, and survival is what makes more clears possible.
- **v4, survival bonus.** Every placement that does not end the game earns `bonus` points, in the player's choice
  and in the targets alike. It started at 40 (the price of a single) and fell linearly to 0 by iteration 30. Games got
  longer (96 → 227) and then stayed flat around 220.
  - The commit's diagnosis: too little data for what the policy turns on. At 6,000 boards an iteration with the small
    network, the difference between two placements is often one hole's worth of value, and that signal was buried.
  - *Interpretation*: λ-returns also needed the exact seven-piece expectation T for every board, which made data
    expensive (next section).

## 3. What made v5 take off

**v5 = TD(λ) bootstrapping from the network instead of from the exact expectation, the standard (full-size) network,
and five times the boards an iteration.** Rubble starts and the fading bonus were kept.

Targets (`examplesTD`, `src/selfplay.wac`) are computed backwards over each game:

    G(t) = r(t+1) + (1 − λ)·V(s(t+1)) + λ·G(t+1),   λ = 0.9

- `s(t+1)` is the board the game actually reached after move t+1; `V` is the current network's value of it.
- `r(t+1)` is the points that move scored, plus the survival bonus if it did not end the game.
- **The last board** of a game cut short by the data budget: G = V of that board.
- **A finished board** gets G = 0, and is not stored.
- **After a random exploring move**: G(t) = `best(t+1)`, the best `r + V` the drawn piece allowed (every placement was
  valued anyway, to choose the move). The chain is cut, because what followed is not the network's own play.

Why this was the unlock:
- **Cost.** The exact expectation values every placement of all 7 pieces for every board, ~175 network evaluations a
  board. It was ~98% of generation cost and, at λ = 0.95, only 5% of each target.
- **TD's cost.** A TD target costs only what playing the move did, the ~25 placements of the drawn piece. An
  iteration can see ~5–7× more boards for the same time.
- **Scale.** With that data the standard network was affordable.

The price is target noise (the luck of the actual next pieces), which v6 later removed (section 6).

**v5 settings**:

| Iterations | Boards an iteration | Replay window | Boards per fit | ε (random move) | Learning rate | Epochs | Bonus |
|---|---|---|---|---|---|---|---|
| 1–52 | 32,000 (8,000 × 4 workers) | 2 iterations | 64,000 | 5% | 0.001 | 1 | 40 → 0 linearly by 30 |
| 53–68 | 32,000 | 3 | 96,000 | 1.5% | 0.0003 | 1 | 0 |
| 69–107 | 32,000 (3 workers, pipelined) | 3 | 96,000 | 1.5% | 0.0003 | 1 | 0 |

Commands:
- start: `EPOCHS=1 sh tools/train.sh v5 standard 60 8000 50 2 0 -900 40 30`;
- from iteration 52: `EPOCHS=1:3 … train.sh v5 standard 100 8000 15 3 52 -900 0 30`;
- from 69: `EPOCHS=1:3 … train-pipe.sh v5 standard 120 32000 15 3 69 -900 0 30`.

λ is passed as −900: negative selects TD(λ) with λ = 0.9. Bonus at iteration i: `40·(30 − i)/30`, rounded down.

Exploration is ε-greedy only: with probability ε a uniformly random placement, otherwise the greedy one (including the
bonus). There was no temperature or softmax policy.

**Progress on games 1001–1020** (greedy, the same 20 games every time; tetrises and lines re-measured from the
checkpoints):

| Iteration | Bonus | Mean score | Pieces a game | Lines a game | Tetrises a game | Share of lines in tetrises |
|---|---|---|---|---|---|---|
| 4 | 36 | 322 | 46 | 8.0 | 0.00 | 0% |
| 8 | 30 | 1,544 | 115 | 35.5 | 0.00 | 0% |
| 12 | 25 | 1,789 | 123 | 38.1 | 0.05 | 1% |
| 16 | 20 | 1,577 | 116 | 35.2 | 0.00 | 0% |
| 20 | 14 | 2,418 | 152 | 49.5 | 0.15 | 1% |
| 24 | 9 | 3,605 | 212 | 73.7 | 0.15 | 1% |
| 26 | 6 | 3,221 | 175 | 58.5 | 0.30 | 2% |
| 28 | 4 | 3,227 | 170 | 56.6 | 0.40 | 3% |
| 30 | 1 | 4,427 | 191 | 64.6 | 1.05 | 7% |
| **32** | **0** | **9,071** | 274 | 97.4 | **3.90** | **16%** |
| 34 | 0 | 9,801 | 241 | 84.2 | 5.35 | 25% |
| 36 | 0 | 11,980 | 275 | 98.3 | 6.75 | 27% |
| 40 | 0 | 11,827 | 238 | 83.0 | 7.55 | 36% |
| 44 | 0 | 15,546 | 269 | 95.6 | 10.65 | 45% |
| 52 | 0 | 15,519 | 279 | 101.0 | 10.25 | 41% |
| 56 | 0 | 17,283 | 310 | 113.5 | 11.45 | 40% |
| 88 | 0 | 20,963 | 326 | 121.0 | 14.90 | 49% |

The bonus column is the bonus the iteration's data was generated with; the checks score points only. A full game is
130 lines.

## 4. The starting-board generator (`startingBoard`, `src/selfplay.wac`)

Training games only. Every measurement is from an empty board.

**v3 to v5 iteration 16**:
- 50% empty;
- 50% rubble: 0–10 rows (uniform) at the bottom, each row full except for 1–3 gaps at random columns. The gaps are
  drawn with replacement, so sometimes fewer than the number drawn.

**From v5 iteration 17 onwards** (the run was stopped at iteration 17 and resumed with this; the existing summary in
`docs/results.md` says "iteration 24", which is the first check after the change, not when it was made):
- 50% empty;
- **20% a well**: 1–12 rows (uniform), each full except for one shared column chosen uniformly from the ten. An I
  dropped in clears up to four at once.
- 30% rubble as before.

The reasoning behind wells:
- A player that clears lines one at a time never builds a well, so it never sees what a tetris pays.
- A ready-made well shows the value of 4-at-once directly. It is not a lesson in how to build one: the network has to
  find for itself that keeping a column open leads to such boards.

Rubble rows never include a ready well by design, though random gaps sometimes line up.

## 5. The survival bonus, and what turned tetrises on

- **Value**: 40 points for every placement that does not end the game, from iteration 0.
- **Fade**: linear, reaching 0 at iteration 30.
- **Where it applies**: everywhere the player's values are used during training — the greedy choice in data generation,
  the reward `r` in TD targets, and `best` at exploration cuts.
- **Checks**: always points only, no bonus.

**What it did.** At 40 a piece, surviving is worth about as much as clearing a single line every piece. The bonus
dominates the value of any board. It taught the beginner to keep a low, clean stack, and in a 130-line game that means
clearing lines constantly. By iteration 24 games lasted ~210 pieces and cleared ~74 lines, almost all singles.

**What it cost.** A well is a risk:
- it keeps the stack higher;
- it waits for an I piece (1 in 7);
- a misplaced piece can bury it.

With a per-piece survival reward worth as much as a single, that risk costs more than the tetris premium earns. So the
policy cleared singles.

**The evidence that removing it is what turned on tetrises** is correlational, from the one run (table above):
- Wells were in the starting boards from iteration 17. For the next 11 iterations, with the bonus still 20 → 4,
  tetrises stayed at 0–0.4 a game.
- As the bonus reached its last few points, they took off: 1.05 a game at iteration 30 (bonus 1), 3.90 at 32 (bonus 0),
  6.75 at 36.
- By iteration 44 they were 10.65 a game, and 45% of all lines were cleared four at a time.
- Score followed: 3,227 at iteration 28 → 9,071 at 32.

Caveat: no ablation was run, so the wells' contribution can't be separated from the bonus's.
- Wells were already present when the bonus faded, and the network may also simply have needed the ~11 iterations to
  learn from them.
- A run with wells from the start and the same fade, or wells and a slower fade, would separate the two.

*Interpretation*: the wells supplied the knowledge that a tetris pays, and the fading bonus removed the incentive not to
pursue one. It is likely that both were needed.

## 6. The handoff to exact targets (v6)

v5 plateaued around 19–21k on games 1001–1020 (iterations 64–104 range 17,546–21,327, noise included). On 100 games
(1001–1100), iteration 88 scored 19,809 ± 588.

**v6 continued from v5 iteration 88** with the exact one-step expectation back in the targets, as λ-returns:

    G(t) = (1 − λ)·T(t) + λ·(points(t+1) + G(t+1)),   λ = 0.5

T(t) is the exact mean over the 7 next pieces of the best `points + V(child)`. Settings:
- 5,000 boards an iteration;
- the last 6 iterations kept (30,000 a fit);
- ε 1.5%;
- learning rate 0.0001, 2 epochs a fit;
- no bonus.

Command: `EPOCHS=2:1 sh tools/train-pipe.sh v6 standard 200 5000 15 6 0 500 0 1`, with v5's iteration-88 weights
copied in as model 0.

| v6 iteration | Games 1001–1100 |
|---|---|
| 0 (v5 it. 88) | 19,809 ± 588 |
| 8 | 21,031 ± 605 |
| 16 | 22,707 ± 550 |
| 24 | 24,018 ± 460 |
| 48 | **24,711 ± 416** (the model used afterwards) |
| 56 | 24,161 ± 538 |

On games 1–1000, v6 iteration 48 scores 23,667 ± 168 against turbostack's model at 22,055 ± 192, a gain of 4,500 over
v5.

**Why exact targets work only once the policy is competent**:
- **From scratch they fail (v1).** The exact target is correct only relative to V, and V is ~0 everywhere, so
  information creeps back one piece an iteration. Its cost per board also means few boards.
- **Once V is good** (it knows the long-horizon value of stacks, wells and lines remaining), only a short horizon is
  needed: λ = 0.5 suffices.
- **Removing TD's noise.** TD's target rides on the luck of the actual next pieces; the exact expectation averages it
  out, a noiseless target for a nearly-right V. Noise in the target was what held v5 back.
- **The budget changes.** 5,000 exact-target boards cost about what 32,000 TD boards did (~2 min an iteration either
  way).

The bootstrapping phase needs cheap, long-horizon, noisy targets (TD(λ), λ high, many boards). Refinement wants
expensive, short-horizon, exact ones.

## 7. Practical lessons

- **Always check on fixed seeds.** Every check plays the same games (1001–1020 during training, 1001–1100 or 1–1000
  for verdicts), and comparisons are paired game by game. A game's score is mostly the luck of its pieces: the
  standard deviation is ~5,000–7,000 on a ~20,000 mean.
  - Players compared on different games differ by luck.
  - On the same games, the difference is play, and the paired standard error is several times smaller.
  - Game sequences come from mulberry32, so the original TypeScript can replay exactly the same games.
- **Small checks flatter the checkpoint you pick.** Choosing the best of many checkpoints by a 20-game check selects
  for luck:
  - v5 iteration 88 scored 20,963 on games 1001–1020 but 19,809 on 1001–1100;
  - iteration 104 scored 21,327 on the 20, the best 20-game check of the run, yet no better.
  - v6 iteration 48, picked as the best on 1001–1100, scored 24,711 there and 23,667 on 1–1000.

  Pick on one set and report on another, and use ≥ 100 games for any decision.
- **The 20-game checks are noisy iteration to iteration** (e.g. v5 at 88 → 92: 20,963 → 17,546). Read trends over
  several checks.
- **Training error rises as the player improves** (v5: 104 → ~700 RMS points). The targets grow, so this is expected
  and is not a sign of failure. Held-out error tracking training error is the check that the network isn't memorising.
- **Cost on 4 CPU cores** (wac's CPU backend; a GPU framework would be far faster):

  | Run | Time per iteration | Iterations | Total |
  |---|---|---|---|
  | v1–v4, small network, 6,000 boards | 60–130 s | 4–11 each | ~1 h together |
  | v5, 32,000 TD boards | ~130 s | 107 | 3.8 h |
  | v6, 5,000 exact-target boards | ~116 s | 58 | 1.9 h |

  About 6 hours from random weights to v6 iteration 48. Earlier logged runs (v1–v4) were stopped as soon as they were
  clearly flat; their iteration counts are short by choice.
- **Make the long runs restartable.** Keep every checkpoint and every iteration's data, and let the scripts resume
  from iteration k. v5 was stopped and resumed three times to change its settings, and later long runs lost their
  container mid-run.
- **What a re-implementation should keep**:
  - games of every length 1–130, with lines remaining as an input;
  - value = points still to come, with finished boards worth 0;
  - rubble and well starts;
  - a survival bonus that fades to 0;
  - TD(λ = 0.9) with many cheap boards for the climb;
  - then exact-expectation λ-returns (λ = 0.5) with a lower learning rate to refine.
