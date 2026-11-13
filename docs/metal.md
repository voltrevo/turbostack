# Training on Metal

v5's recipe (`docs/bootstrapping.md`, section 3) run again with every step on a Mac's GPU, through wac-tensor's Metal
server: **88 iterations in about 6 minutes** (374 s, with a check every other iteration), where the CPU on the same
Mac takes about 47 s an iteration — over an hour. It reaches the same plateau, 19,479 by iteration 36, after about 2½
minutes. (The run was stopped and resumed twice; the times count the iterations, not the pauses.)

    swiftc -O metal/server.swift -o dist/wac-tensor-metal && dist/wac-tensor-metal      (in wac-tensor; port 7787)
    METAL=1 EPOCHS=1 sh tools/train.sh <run> standard 52 8000 50 2 0 -900 40 30
    METAL=1 EPOCHS=1:3 sh tools/train.sh <run> standard 88 8000 15 3 52 -900 0 30

Measured on a cloud Mac (6 cores, Apple's paravirtual GPU), with native wac.

## What runs where

- **Self-play** (`tools/gen.wac --metal`; `generate` in `src/lockstep.wac`) plays 64 games at once and values every
  placement of every game's piece in one batch — 1,400 to 1,700 boards a step, where one game's twenty-odd are too few
  to be worth sending. Finding the placements stays on the CPU: about 0.5 ms of a step. The boards go to the GPU as
  their rows' bits, 21 numbers a board instead of 252 (`packedWalledBoards`, `src/value.wac`), which made play 25%
  faster.
- **Fitting** (`tools/fit.wac --metal`) and **the check games** (`tools/evaluate.wac --metal`, greedy or with one
  piece of lookahead, 20 games at once).
- **All of it in one process**: `tools/learn.wac` keeps the network on the GPU and runs self-play, fitting and checks
  from a schedule of a few smooth knobs, with exact targets and the `dual` network's lookahead phase in lockstep too.

## Speed

| | CPU | Metal |
|---|---|---|
| Self-play, one worker | 2.9 ms a board | 0.12 ms a board |
| Self-play, all workers | about 1,400 boards a second (4 workers) | 14,600 (3 workers), 16,500 (6) |
| Fit of 48,000 boards, one epoch | 19.2 s | 2.2 s |
| v5 iterations 1–4 (`docs/runs/cpu-v5-1-4.txt`) | 185.5 s | 16.7 s |
| v5 iterations 53–88, each | — | 4.1 s, 4.6 s with the check every other iteration |

Self-play was 0.87 ms a board until two fixes in the Metal server (wac-tensor): its buffer pool matched exact lengths,
so a batch of a new size — almost every batch in lockstep play — ran on fresh memory, which the GPU is slow to touch;
and MPS compiled a matrix-product pipeline for every new number of rows. Buffers now come in size classes and products
in power-of-two row blocks.

## Scores

Games 1001–1020, greedy (`docs/runs/metal-v5.txt`), against v5's table:

| Iteration | v5 (CPU) | Metal run |
|---|---|---|
| 8 | 1,544 | 1,597 |
| 16 | 1,577 | 2,829 |
| 20 | 2,418 | 7,720 |
| 24 | 3,605 | 10,821 |
| 32 | 9,071 | 15,043 |
| 36 | 11,980 | 19,479 |
| 44 | 15,546 | 17,253 |
| 52 | 15,519 | 19,972 |
| 56 | 17,283 | 18,353 |
| 88 | 20,963 | 19,159 |

A check's standard error is about 1,000–1,700 at these scores. The plateau is v5's (v5's iterations 64–104 ranged
17,546–21,327; this run's 36–88 range 16,411–21,207), but **it got there in 36 iterations rather than about 64**. This
run differs from v5 in three ways, so one run cannot say which mattered:

- **Starting boards have wells from the first iteration**; v5 added them at iteration 17. This is the ablation
  `docs/bootstrapping.md` says was never run.
- Lockstep play draws the pieces in another order, so its games are not v5's games.
- From iteration 69, v5 used `tools/train-pipe.sh` (three pipelined workers); this run kept `tools/train.sh` with four,
  the same 32,000 boards an iteration.
