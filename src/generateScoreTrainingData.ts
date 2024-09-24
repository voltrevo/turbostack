// Assuming Board, PieceType, and other necessary classes and functions are imported
import { deepSamplesPerGame, lookaheadSamplesPerGame, nPlayoutsToAvg, stdMaxLines } from './hyperParams';
import { Board } from './Board';
import { generateGameBoards } from './generateGameBoards';
import { randomBoardEvaluator } from './randomBoardEvaluator';
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
        const { positions } = generateGameBoards(new Board(stdMaxLines), randomBoardEvaluator);

        if (positions.length === 0) {
            throw new Error('Should not be possible');
        }

        for (let i = 0; i < deepSamplesPerGame; i++) {
            const position = positions[Math.floor(Math.random() * positions.length)];

            const choices = position.findChoices(getRandomPieceType());
    
            if (choices.length === 0) {
                continue;
            }

            // // pick a random next move, play that, and train it
            // // (model is constantly asked to evaluate all the next choices, so we should train on that
            // // kind of thing as well as 'good' positions)
            // const randomChoice = choices[Math.floor(Math.random() * choices.length)];
            // const { finalScore } = generateGameBoards(randomChoice, boardEvaluator);
            const { positions: newPositions, finalScore } = generateGameBoards(position, boardEvaluator);

            const selPosition = newPositions[Math.floor(Math.random() * newPositions.length)];

            // Add the pair to the training data
            trainingData.push(augment({
                board: selPosition,
                finalScore,
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

function augment({ board, finalScore, boardEvaluator }: {
    board: Board;
    finalScore: number;
    boardEvaluator: BoardEvaluator;
}): ScoreModelDataPoint {
    const scores = [finalScore]

    while (scores.length < nPlayoutsToAvg) {
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
