// When generating training data, play to the end, then backtrack this number of moves
export const boardGenBacktrackLen = {
    min: 2,
    max: 5,
};

// When playing to the end to determine the final score to use for training, play this many times
// and average them
export const nPlayoutsToAvg = 10;

export const stdMaxLines = 130;

// Note: there are also hardcoded per-column limits in Board.ts (expressed as minI instead of height, sorry)
// (Both sets of limits will apply, so the lower height limit for each column will be the effective limit)
export const artificialHeightLimit = Infinity;

// When generating training data, what percentage should be lookahead data
// (lookahead data is training the current board on the average eval of the next move)
export const lookaheadRatio = 0;

export const deepSamplesPerGame = 10;
export const lookaheadSamplesPerGame = 0;

// Other than the board itself, how many features?
// Standard is just linesRemaining
// Sometimes experiment with extra handcrafted stuff
export const extraFeatureLen = 41;

export const useCustomFeatures = true;
export const useBoard = true;
