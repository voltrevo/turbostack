# turbostack

*Stacking AI for NES Tetris.*

Only just got the basics working so far. The default program plays 30 pieces and produces output like this:

```
step 29: Game [
   ....................
  |                    |
  |                    |
  |                    |
  |                    |
  |                    |
  |                    |
  |                    |
  |                    |
  |                    |
  |                    |
  |      [][]          |
  |  []  [][]          |
  |[][]    []    []    |
  |[]      [][]  [][]  |
  |[][]    [][][][][]  |
  |[][]    [][][][][]  |
  |[][]    [][][][][]  |
  |[][]  [][][][][][]  |
  |[][]  [][][][][][]  |
  |[][][][][][][][][]  |
  \--------------------/

  lines: 6/130
  score: 260
  eff  : 43
  trt  : 0.0%
  str  : 00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001100000010110000011001001001000110110110011111011001111101100111110110111111011011111101111111110
  holes: 0
  overh: 2
]
```

At the moment it just prioritizes not making holes, then not making overhangs, then minimizing the stack height.

The goal is to produce a sensible stacking strategy that is easy to learn and reproduce in human play, to ensure 
