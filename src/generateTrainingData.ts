// Assuming Board, PieceType, and other necessary classes and functions are imported
import { Board } from './Board';
import { generateGameBoards } from './generateGameBoards';
import { ALL_PIECE_TYPES, getRandomPieceType } from './PieceType';

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
        trainingData.push(augment({
            board: randomPosition,
            finalScore: finalScore,
            boardEvaluator,
        }));

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
        trainingData.push(augment({
            board: randomChoice,
            finalScore: randomChoiceFinalScore,
            boardEvaluator,
        }));
    }

    return trainingData;
}

function augment({ board, finalScore, boardEvaluator }: {
    board: Board;
    finalScore: number;
    boardEvaluator: BoardEvaluator;
}): TrainingDataPair {
    const scores = [finalScore]

    while (scores.length < 10) {
        const { finalScore: another } = generateGameBoards(board, boardEvaluator);
        scores.push(another);
    }

    const avgScore = scores.reduce((a, b) => a + b) / scores.length;

    return {
        board,
        finalScore: avgScore,
    };
}

/**
 * Generates training data for machine learning.
 * @param boardEvaluator - Function that evaluates a board and predicts the final score.
 * @param n - Number of games to simulate.
 * @returns Array of training data pairs (mlData, finalScore).
 */
export function generateLookaheadTrainingData(
    boardEvaluator: BoardEvaluator,
    n: number,
    samplesPerGame: number,
): TrainingDataPair[] {
    const trainingData: TrainingDataPair[] = [];

    while (trainingData.length < n) {
        const { positions } = generateGameBoards(new Board(130), boardEvaluator);

        for (let i = 0; i < samplesPerGame; i++) {
            const randomPosition = positions[Math.floor(Math.random() * positions.length)];

            // Add the pair to the training data
            trainingData.push(augmentLookahead({
                board: randomPosition,
                boardEvaluator,
            }));
    
            // also pick a random next move, play that, and train it
            // (model is constantly asked to evaluate all the next choices, so we should train on that
            // kind of thing as well as 'good' positions)
    
            const choices = randomPosition.findChoices(getRandomPieceType());
            
            if (choices.length === 0) {
                continue;
            }
    
            const randomChoice = choices[Math.floor(Math.random() * choices.length)];
    
            // Add the pair to the training data
            trainingData.push(augmentLookahead({
                board: randomChoice,
                boardEvaluator,
            }));
        }
    }

    return trainingData;
}

function augmentLookahead({ board, boardEvaluator }: {
    board: Board;
    boardEvaluator: BoardEvaluator;
}): TrainingDataPair {
    const scores = [];

    for (const p of ALL_PIECE_TYPES) {
        const choices = board.findChoices(p);

        if (choices.length === 0) {
            scores.push(board.score);
        }

        // Use evalBoard to evaluate each possible board
        const choiceEvals = boardEvaluator(choices);

        // Find the board with the highest evalScore
        choiceEvals.sort((a, b) => b - a);

        scores.push(choiceEvals[0]);
    }

    const avgScore = scores.reduce((a, b) => a + b) / scores.length;

    return {
        board,
        finalScore: avgScore,
    };
}
