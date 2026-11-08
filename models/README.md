# Models

- `turbostack.weights` — turbostack's published score model (voltrevo/turbostack-game, `public/scoreModel`), converted
  from TensorFlow.js by turbostack-compare's `src/convert.ts`. Loads into `LegacyScoreModel` (`src/legacy.wac`).
- `self-taught.weights` — the best value network learned by self-play from nothing (`tools/train.sh`), for
  `ValueNet` with `ValueConfig.standard()` (`src/value.wac`). Replaced as training finds better ones.
