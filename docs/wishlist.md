# Wishlist

Ideas worth doing, not yet started. Each says what it is for and what it builds on.

## Coaching from the player model

The coach judges every move but nothing in it learns from the player yet. The player model (`src/human.wac`,
`docs/humanfit.md`) does, offline: a softmax over placements from the network's values and 14 features, fitted by
Newton's method. It means something after about 500 moves and levels off near 2,000, and it fits in 16 ms at 500
moves and 131 ms at 2,000 in wasm, so all of this can run on the player's device.

1. **Fit the player in the browser.** From about 500 moves, fit the profile in the page and update it after each move
   from the last fit, over a window of the most recent ~2,000 moves (the player changes, and the fit slows beyond
   that). The moves are already kept with every placement's `q`, which is all the fit needs.
2. **Blind spots, in points.** Turn the weights into sentences a player can act on — "you avoid tucks; the tucks you
   passed up cost about N points a game" — by summing the loss over moves where the model's choice had a feature the
   player's did not. Say how sure the fit is.
3. **Practice positions.** Serve positions where the model's move is worth a lot and the profile says the player is
   unlikely to find it: predicted loss under the player model, times how sure it is. The 10% of positions the model
   flags hold about a third of a player's biggest mistakes, so this is where practice pays. Draw them from the player's
   own games and from the model's self-play; one try without the hint, then the answer; serve that kind of position
   again until the player's predicted chance of finding the best move rises.
4. **Show whether it works.** Predicted loss on fresh games, and how the weights move, over time — for the player and
   for us.
5. **A population prior.** Once players can choose to share their moves with a server (its design is not settled),
   fit the prior to every shared player's moves, so a new player's predictions are useful sooner, and profile a new
   player against that population.

## Important positions, kept for later

Use the player model to pick out the positions that matter — large expected loss for this player, or a gap between
what they did and what the model knows — and keep them in a list the player can come back to: "positions to look at
again". The list is the raw material for practice (3) and for reviewing a game. Kept in the browser for now; with a
server, it could follow a player across devices.

## Logging

- Moves record whether the hint showed, mouse or touch, and which of the nearest placements was picked. Still to
  consider: telling apart several players who share one browser.
