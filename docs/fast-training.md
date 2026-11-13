# Fast training: from nothing to close to v10 in 27 minutes

From random weights, `tools/learn.wac` on a Mac's GPU comes **close to v10 (−440 ± 383, one run)**: **28,150 ± 313
with one piece of lookahead on games 1–200** after 27 minutes of training, 9.8 for greedy play and then 17.5 for the
lookahead value. v10, the best network here (`models/self-taught-dual.weights`), scores 28,590 on the same games; game
by game the difference is −440 ± 383, higher in 88 of 200. The original runs took about 6 hours on 4 CPU cores to reach
v6, and about 6 more for v10's phase (`docs/bootstrapping.md`, `docs/runs/logs/v10.out`). The same `learn.wac`
iteration is 70–75 times slower on one CPU core (`docs/reviews/amp.md`), so most of the speed is the GPU's. The
network is `models/fast-dual.weights`.

Measured on a cloud Mac (6 cores, Apple's paravirtual GPU) through wac-tensor's Metal server (`docs/metal.md`). Times are
self-play and fitting; checks are left out. **One run of each schedule, one seed**: how much runs vary is not measured.

## The recipe

    wac run --allow-read --allow-write --allow-net tools/learn.wac --metal s4 iters=120 exactFrom=0.25 exactFull=0.35 bonusUntil=0.17 checkEvery=6
    wac run --allow-read --allow-write --allow-net tools/learn.wac --metal s4-dual iters=120 exactFrom=0.25 exactFull=0.35 bonusUntil=0.17 \
        from=runs/s4/model-120.weights start=120 dualIters=36 dualLook=2

The second command is the lookahead phase run on its own from the first's weights; `dualIters=36 dualLook=2` on the
first command does both in one. Every setting is printed at the top of the run's log (`docs/runs/learn-s4.txt`).

**Greedy phase**, 120 iterations, each knob moving smoothly across them:

- learning rate 0.001 → 0.0001 (geometric), exploration 5% → 1.5%, λ 0.9 → 0.5;
- a survival bonus of 40 a piece fading to nothing by 17% of the way;
- the share of boards whose target bootstraps from the exact expectation over the next piece (v6's target) rising from 0
  at 25% to all at 35%; the rest bootstrap from the next board reached (TD, v5's). Boards an iteration go from 32,000
  to 8,000 with it, the fit window from 64,000 to 32,000 and epochs from 1 to 2;
- 256 games played at once, **continued across iterations**.

**Lookahead phase**, 36 iterations: v10's settings. Head 1 starts as a copy of head 0; games are played with lookahead
(3 candidates), every board's head-0 target exact, and a third of 3,000 boards an iteration given a lookahead target
(2 candidates); learning rate 0.0001, 2 epochs, the last 18,000 boards.

## Results

Greedy checks on games 1001–1100 (`docs/runs/learn-*.tsv`, `learn-*.txt`):

| Run | Schedule | Final check | Training |
|---|---|---|---|
| speed1 | 40 iterations, exact from 60% to 80%, games ended every iteration | 18,263 | 2.9 min |
| s2 | 80 iterations, exact from 35% to 45%, bonus gone by 25% | 21,175 | 6.0 min |
| s3 | s2 with games continued across iterations | 22,398 | 6.1 min |
| **s4** | 120 iterations, exact from 25% to 35%, bonus gone by 17% | **24,191** | 9.8 min |

v5 reached 19,809 on these games and v6 24,711.

With lookahead, games 1–200:

| Network | Mean | Against v10 (28,590) | Training in all |
|---|---|---|---|
| **s4 + 36 lookahead iterations** | **28,150 ± 313** | −440 ± 383, higher in 88 | 27.4 min |
| s4 + 12 lookahead iterations | 27,399 ± 332 | −1,191 ± 374, higher in 76 | 15.5 min |
| s3 + 24 lookahead iterations | 26,616 ± 377 | — | 16.7 min |

Games in `docs/runs/learn-s4-dual-*-one-piece-1-200.txt`. The 50-game checks during the lookahead phase flatter: the
final network read 29,011 on games 1001–1050.

## What mattered

- **Continuing games across iterations.** Ending every game when an iteration had its boards meant most boards came
  from the first moves of new games. Continuing them took the same schedule from 21,175 to 22,398, ahead at 7 of the
  last 8 checks.
- **Exact targets earlier, and for longer.** With the exact share rising from 25% of the way, greedy play was still
  climbing at the end (23,608 → 24,191 over the last 18 iterations); switching at 35–45% of a shorter run flattened out
  near 21,000.
- **The lookahead phase is two thirds of the time**, about 28 s an iteration against 5 for an exact greedy one.

## Where the time goes, and what to try next

- A GPU profile (`WAC_METAL_PROFILE=1`) of the value network puts most of its time in elementwise passes, mostly
  wac-tensor's `leakyRelu` (a comparison, a multiply and a select, each with filled constants) and bias adds, not in the
  matrix products. A fused bias-and-activation kernel in wac-tensor would speed every run.
- Two runs sharing the GPU slow each other far more than twice: run one at a time.
- Not yet tried: more seeds, to measure how much runs vary; a longer or cheaper lookahead phase, to pass 29,000; the
  network's size and structure.
