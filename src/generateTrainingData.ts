// Assuming Board, PieceType, and other necessary classes and functions are imported
import { boardGenBacktrackLen, deepSamplesPerGame, lookaheadSamplesPerGame, stdMaxLines } from '../programs/helpers/hyperParams';
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
export function generateTrainingData(
    boardEvaluator: BoardEvaluator,
    n: number,
): TrainingDataPair[] {
    const trainingData: TrainingDataPair[] = [];

    while (trainingData.length < n) {
        const { positions } = generateGameBoards(new Board(stdMaxLines), boardEvaluator);

        if (positions.length === 0) {
            throw new Error('Should not be possible');
        }

        const backtrackLen = (
            boardGenBacktrackLen.min +
            Math.floor(Math.random() * (
                boardGenBacktrackLen.max - boardGenBacktrackLen.min
            ))
        );

        const positionIndex = Math.max(0, positions.length - backtrackLen);
        const position = positions[positionIndex];

        const choices = position.findChoices(getRandomPieceType());

        if (choices.length === 0) {
            continue;
        }

        for (let i = 0; i < deepSamplesPerGame; i++) {
            // pick a random next move, play that, and train it
            // (model is constantly asked to evaluate all the next choices, so we should train on that
            // kind of thing as well as 'good' positions)
            const randomChoice = choices[Math.floor(Math.random() * choices.length)];
            const { finalScore } = generateGameBoards(randomChoice, boardEvaluator);

            // Add the pair to the training data
            trainingData.push(augment({
                board: randomChoice,
                finalScore,
                boardEvaluator,
            }));
        }

        for (let i = 0; i < lookaheadSamplesPerGame; i++) {
            // pick a random next move, play that, and train it
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

function augmentLookahead({ board, boardEvaluator }: {
    board: Board;
    boardEvaluator: BoardEvaluator;
}): TrainingDataPair {
    const scores = [];

    for (const p of ALL_PIECE_TYPES) {
        const choices = board.findChoices(p);

        if (choices.length === 0) {
            scores.push(board.score);
            continue;
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
