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
    boardStats: (boards: Board[]) => unknown = boardEvaluator,
) {
    const sample = await getSampleBoard(boardEvaluator);
    console.log(sample.toString());
    console.log('Prediction for sample above:', boardStats([sample]));

    console.log('Game start prediction:', boardStats([new Board(stdMaxLines)]));

    console.log('Validation loss:', valLoss);

    const calc = new WelfordCalculator();

    for (let i = 0; i < 30; i++) {
        const { finalScore } = await generateGameBoards(new Board(stdMaxLines), boardEvaluator);
        calc.update(finalScore);
    }

    console.log(calc.fmt());

    const durationMinutes = (duration / 60_000).toFixed(1);
    console.log(`Training for ${durationMinutes} minutes`);

    await addPerfLog(durationMinutes, valLoss, calc.fmt());
}

async function getSampleBoard(boardEvaluator: BoardEvaluator) {
    const { positions } = await generateGameBoards(new Board(stdMaxLines), boardEvaluator);

    if (positions.length === 0) {
        throw new Error('Should not be possible');
    }

    return positions[Math.floor(positions.length / 2)];
}
