// Assuming Board, PieceType, and other necessary classes and functions are imported
import { Board, MlInputData } from './Board';
import { generateGameBoards } from './generateGameBoards';
import { getRandomPieceType } from './PieceType';

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
export function generateTrainingData(boardEvaluator: BoardEvaluator, n: number, samplesPerGame: number): TrainingDataPair[] {
    const trainingData: TrainingDataPair[] = [];

    for (let gameIndex = 0; gameIndex < n; gameIndex++) {
        const { positions, finalScore } = generateGameBoards(boardEvaluator);

        for (let i = 0; i < samplesPerGame; i++) {
            // Pick one position at random from the game
            let position;

            if (i === 0) {
                position = positions[0];
            } else {
                const randomIndex = Math.floor(Math.random() * positions.length);
                position = positions[randomIndex];
            }

            // Get the mlData from the randomly selected position
            const mlInputData = position.toMlInputData();

            // Add the pair to the training data
            trainingData.push({
                mlInputData,
                finalScore,
            });
        }
    }

    return trainingData;
}
