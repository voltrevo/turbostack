import { Board } from "./Board";
import { generateGameBoards } from "./generateGameBoards";
import { BoardEvaluator, TrainingDataPair } from "./generateTrainingData";

export function showPerformanceSummary(
    boardEvaluator: BoardEvaluator,
    trainingData: TrainingDataPair[],
) {
    // console.log(trainingData[1].mlInputData.board.map(r => r.map(c => c[0])));

    const sample = getSampleBoard(boardEvaluator);
    console.log(sample.toString());
    console.log('Prediction for sample above:', boardEvaluator([sample]));

    console.log('Game start prediction:', boardEvaluator([new Board(130)]));

    console.log(
        'Average score:',
        trainingData.map(x => x.finalScore).reduce((a, b) => a + b) / trainingData.length,
    );
}

function getSampleBoard(boardEvaluator: BoardEvaluator) {
    const { positions } = generateGameBoards(boardEvaluator);

    return positions[Math.floor(positions.length / 2)];
}
