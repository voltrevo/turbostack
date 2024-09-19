// Assuming Board, PieceType, and other necessary classes and functions are imported
import { Board } from './Board';
import { generateGameBoards } from './generateGameBoards';
import { getRandomPieceType } from './PieceType';

// The evalBoard function predicts the final score from the given board
export type BoardEvaluator = (boards: Board[]) => number[];

// The output type of generateTrainingData
export type TrainingDataPair = {
    board: Board;
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
        const { positions, finalScore } = generateGameBoards(new Board(130), boardEvaluator);

        const randomPosition = positions[Math.floor(Math.random() * positions.length)];

        // Add the pair to the training data
        trainingData.push({
            board: randomPosition,
            finalScore: finalScore,
        });

        // also pick a random next move, play that, and train it
        // (model is constantly asked to evaluate all the next choices, so we should train on that
        // kind of thing as well as 'good' positions)

        const choices = randomPosition.findChoices(getRandomPieceType());
        
        if (choices.length === 0) {
            continue;
        }

        const randomChoice = choices[Math.floor(Math.random() * choices.length)];
        const { finalScore: randomChoiceFinalScore } = generateGameBoards(randomChoice, boardEvaluator);

        // Add the pair to the training data
        trainingData.push({
            board: randomChoice,
            finalScore: randomChoiceFinalScore,
        });
    }

    return trainingData;
}
