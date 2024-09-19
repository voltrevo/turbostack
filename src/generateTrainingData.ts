// Assuming Board, PieceType, and other necessary classes and functions are imported
import { Board, MlInputData } from './Board';
import { generateGameBoards } from './generateGameBoards';

// The evalBoard function predicts the final score from the given board
export type BoardEvaluator = (boards: Board[]) => number[];

// The output type of generateTrainingData
export type TrainingDataPair = {
    mlInputData: MlInputData;
    finalScore: number;
};

/**
 * Generates training data for machine learning.
 * @param boardEvaluator - Function that evaluates a board and predicts the final score.
 * @param n - Number of games to simulate.
 * @returns Array of training data pairs (mlData, finalScore).
 */
export function generateTrainingData(boardEvaluator: BoardEvaluator, n: number): TrainingDataPair[] {
    const trainingData: TrainingDataPair[] = [];

    while (trainingData.length < n) {
        const { positions, finalScore } = generateGameBoards(boardEvaluator);

        const randomPosition = positions[Math.floor(Math.random() * positions.length)];

        // Add the pair to the training data
        trainingData.push({
            mlInputData: randomPosition.toMlInputData(),
            finalScore,
        });
    }

    return trainingData;
}
