import { stdMaxLines } from "./hyperParams";
import { addPerfLog } from "./addPerfLog";
import { Board } from "./Board";
import { generateGameBoards } from "./generateGameBoards";
import { WelfordCalculator } from "./WelfordCalculator";
import { BoardEvaluator } from "./BoardEvaluator";

export async function showPerformanceSummary(
    duration: number,
    valLoss: number,
    boardEvaluator: BoardEvaluator,
) {
    const sample = getSampleBoard(boardEvaluator);
    console.log(sample.toString());
    console.log('Prediction for sample above:', boardEvaluator([sample]));

    console.log('Game start prediction:', boardEvaluator([new Board(stdMaxLines)]));

    console.log('Validation loss:', valLoss);

    const calc = new WelfordCalculator();

    for (let i = 0; i < 30; i++) {
        const { finalScore } = generateGameBoards(new Board(stdMaxLines), boardEvaluator);
        calc.update(finalScore);
    }

    const mean = calc.getMean();
    const stdev = calc.getStdev();
    const metaStdev = stdev / Math.sqrt(calc.n);

    // This is a little crude because it assumes stdev is the true value, but it seems to work
    // more than well enough for our purposes
    const rel2StdevError = 2 * metaStdev / mean;

    console.log(`Avg: ${Math.round(mean)} ± ${(100 * rel2StdevError).toFixed(1)}% (n=${calc.n})`);
    console.log(`Stdev: ${stdev}`);

    const durationMinutes = (duration / 60_000).toFixed(1);
    console.log(`Training for ${durationMinutes} minutes`);

    await addPerfLog(durationMinutes, valLoss, mean - 2 * metaStdev, mean + 2 * metaStdev);
}

function getSampleBoard(boardEvaluator: BoardEvaluator) {
    const { positions } = generateGameBoards(new Board(stdMaxLines), boardEvaluator);

    if (positions.length === 0) {
        throw new Error('Should not be possible');
    }

    return positions[Math.floor(positions.length / 2)];
}
