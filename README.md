# wac-turbostack

[turbostack](https://github.com/voltrevo/turbostack) — a stacking AI for NES-style Tetris — rewritten in wac, and a
model that learned to play it from nothing.

**Watch it play:** the pages site puts the self-taught model and turbostack's original side by side on the same pieces
(`web/play.wac`, `sh tools/site.sh`).

## The game

`src/board.wac` is turbostack's game exactly: a 20×10 board, the seven pieces, placements by drop, one rotation or one
shift, 40/100/300/1,200 for one to four lines, 130 lines a game, and a stack above 15 rows ending it. turbostack-compare
checks it against the original: 495,466 choices from 3,000 positions, all identical and in the same order.

## The number to beat

turbostack's published score model, playing greedily in the original code on 1,000 seeded games: **22,055 ± 192**
(median 23,460; a third of games end before 130 lines). Its port here (`src/legacy.wac`) predicts what TensorFlow.js
does to within one float rounding, and plays the same games, game for game.

## Learning from nothing

`src/value.wac` is a network that values a board as the points still to come, from the board and the lines remaining
alone; `src/selfplay.wac` and `tools/train.sh` train it by self-play — no human games, no hand-made features. What it took
is in the commit history: λ-returns, starting boards with rubble and wells (where a clear or a tetris is a move away), a
survival reward that fades to nothing, and TD(λ) targets cheap enough to see five times the boards. It learned to clear
lines, then to survive, then — once only points counted — to build for tetrises.

## Running things

    wac test test                                                  the rules and the piece sequence
    wac run --allow-read tools/checkchoices.wac <choices.txt>      the rules against the original's (turbostack-compare)
    wac run --allow-read tools/evaluate.wac standard models/self-taught.weights 1 1000
    wac run --allow-read tools/evaluate.wac legacy models/turbostack.weights 1 1000
    sh tools/train.sh <run> standard <iterations> ...              learn (see the script for its arguments)
    wac run --allow-read tools/show.wac standard models/self-taught.weights <seed>
    sh tools/site.sh                                               the pages site in dist/site
