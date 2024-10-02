export const stdMaxLines = 130;

// Note: there are also hardcoded per-column limits in Board.ts (expressed as minI instead of height, sorry)
// (Both sets of limits will apply, so the lower height limit for each column will be the effective limit)
export const artificialHeightLimit = 15;

// When generating training data, how many deep samples and how many lookahead samples to generate
// for each base game
// (lookahead data is training the current board on the average eval of the next move)
export const samplesPerGame = 1;
export const sampleDepth = 20;
export const nPlayoutsToAvg = 100;

// We use nPlayoutsToAvg as a minimum playouts, but we also want our confidence in the true average
// to be below this number, so we continue doing playouts until our stdev *of the mean* is below
// this number. (ie, the stdev of the mean should reduce as 1/sqrt(playouts))
export const maxScoreMeanStdev = 100;

// Other than the board itself, how many features?
// Standard is just linesRemaining (and score?)
// Sometimes experiment with extra handcrafted stuff
export const extraFeatureLen = 2;

export const useCustomFeatures = false;

export const validationSplit = 0.2;

export const evalNodeCount = 44;
