# Models

- `turbostack.weights` — turbostack's published score model (voltrevo/turbostack-game, `public/scoreModel`), converted
  from TensorFlow.js by turbostack-compare's `src/convert.ts`. Loads into `LegacyScoreModel` (`src/legacy.wac`).
- `self-taught.weights` — the best value network learned by self-play from nothing (`tools/train.sh`), for
  `ValueNet` with `ValueConfig.standard()` (`src/value.wac`). Replaced as training finds better ones.
- `self-taught-dual.weights` — the `dual` network (`ValueConfig.dual()`): the greedy value and the value of play with
  lookahead, for `tools/evaluate.wac dual … 3`. Run v10 iteration 36, learned from v6 by self-play.
