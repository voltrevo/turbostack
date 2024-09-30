// Assuming Board, PieceType, and other necessary classes and functions are imported
import { deepSamplesPerGame, lookaheadSamplesPerGame, nPlayoutsToAvg, stdMaxLines } from './hyperParams';
import { Board } from './Board';
import { generateGameBoards } from './generateGameBoards';
import { ALL_PIECE_TYPES, getRandomPieceType } from './PieceType';
import { ScoreModelDataPoint } from './ScoreModel';
import { BoardEvaluator } from './BoardEvaluator';

/**
 * Generates training data for machine learning.
 * @param boardEvaluator - Function that evaluates a board and predicts the final score.
 * @param n - Number of games to simulate.
 * @returns Array of training data pairs (mlData, finalScore).
 */
export function generateScoreTrainingData(
    boardEvaluator: BoardEvaluator,
    n: number,
): ScoreModelDataPoint[] {
    const trainingData: ScoreModelDataPoint[] = [];

    while (trainingData.length < n) {
        const maxLines = Math.floor(stdMaxLines);
        let { positions } = generateGameBoards(new Board(maxLines), boardEvaluator);

        if (positions.length === 0) {
            throw new Error('Should not be possible');
        }

        for (let i = 0; i < deepSamplesPerGame; i++) {
            let position = positions[Math.floor(randMaxN(3) * positions.length)];
            const prevBoard = position;

            const choices = position.findChoices(getRandomPieceType());

            if (choices.length === 0) {
                i--;
                continue;
            }

            // pick a random next move, play that, and train it
            // (model is constantly asked to evaluate all the next choices, so we should train on that
            // kind of thing)
            position = choices[Math.floor(Math.random() * choices.length)];

            // Add the pair to the training data
            trainingData.push(augment({
                prevBoard,
                board: position,
                boardEvaluator,
            }));
        }

        for (let i = 0; i < lookaheadSamplesPerGame; i++) {
            const position = positions[Math.floor(Math.random() * positions.length)];

            const choices = position.findChoices(getRandomPieceType());

            if (choices.length === 0) {
                continue;
            }

            // pick a random next move, play that, and train it
            // const randomChoice = choices[Math.floor(Math.random() * choices.length)];

            // Add the pair to the training data
            trainingData.push(augmentLookahead({
                board: position,
                boardEvaluator,
            }));
        }
    }

    return trainingData;
}

function randMaxN(n: number): number {
    let max = 0;

    for (let i = 0; i < n; i++) {
        max = Math.max(max, Math.random());
    }

    return max;
}

function randMinN(n: number): number {
    let min = 1;

    for (let i = 0; i < n; i++) {
        min = Math.min(min, Math.random());
    }

    return min;
}

function augment({ prevBoard, board, boardEvaluator }: {
    prevBoard: Board;
    board: Board;
    boardEvaluator: BoardEvaluator;
}): ScoreModelDataPoint {
    const scores = []

    while (scores.length < nPlayoutsToAvg) {
        const { finalScore } = generateGameBoards(board, boardEvaluator);
        scores.push(finalScore);
    }

    const avgScore = scores.reduce((a, b) => a + b) / scores.length;

    return {
        prevBoard,
        board,
        finalScore: avgScore,
        finalScoreSamples: scores,
    };
}

function augmentLookahead({ board, boardEvaluator }: {
    board: Board;
    boardEvaluator: BoardEvaluator;
}): ScoreModelDataPoint {
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
