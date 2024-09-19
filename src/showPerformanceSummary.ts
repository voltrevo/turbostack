import { Board } from "./Board";
import { generateGameBoards } from "./generateGameBoards";
import { BoardEvaluator, generateTrainingData } from "./generateTrainingData";

export function showPerformanceSummary(
    boardEvaluator: BoardEvaluator,
) {
    const newTrainingData = generateTrainingData(boardEvaluator, 30);

    const sample = getSampleBoard(boardEvaluator);
    console.log(sample.toString());
    console.log('Prediction for sample above:', boardEvaluator([sample]));

    console.log('Game start prediction:', boardEvaluator([new Board(130)]));

    console.log(
        'Average score:',
        newTrainingData.map(x => x.finalScore).reduce((a, b) => a + b) / newTrainingData.length,
    );
}

function getSampleBoard(boardEvaluator: BoardEvaluator) {
    const { positions } = generateGameBoards(new Board(130), boardEvaluator);

    return positions[Math.floor(positions.length / 2)];
}
