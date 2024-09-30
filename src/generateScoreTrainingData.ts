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
    scoreBoardEvaluator: BoardEvaluator,
    predictionBoardEvaluator: BoardEvaluator,
    n: number,
): ScoreModelDataPoint[] {
    const trainingData: ScoreModelDataPoint[] = [];

    while (trainingData.length < n) {
        let { positions } = generateGameBoards(new Board(stdMaxLines), scoreBoardEvaluator);

        if (positions.length === 0) {
            throw new Error('Should not be possible');
        }

        for (let i = 0; i < deepSamplesPerGame; i++) {
            const posI = Math.floor(Math.random() * positions.length);
            let position: Board;
            let prevBoard: Board;

            if (Math.random() < 0.5) {
                prevBoard = positions[posI];

                // model is constantly asked to evaluate all the next choices, so we should train on
                // that kind of thing
                const randChoice = applyRandomChoice(prevBoard);

                if (randChoice === undefined) {
                    i--;
                    continue;
                }

                position = randChoice;
            } else {
                position = positions[posI];
                prevBoard = positions[posI - 1] ?? new Board(stdMaxLines);
            }

            // Now that we've seeded the position, give the prediction model an amount of lines
            // cleared that is appropriate for training

            // in the range [0,stdMaxLines) but heavily weighted towards 0
            const desiredRemainingLines = Math.floor(randMinN(3) * stdMaxLines);

            position.lines_cleared_max = position.lines_cleared + desiredRemainingLines;
            prevBoard.lines_cleared_max = position.lines_cleared_max;

            // Add the pair to the training data
            trainingData.push(augment({
                prevBoard,
                board: position,
                boardEvaluator: predictionBoardEvaluator,
            }));
        }

        if (lookaheadSamplesPerGame !== 0) {
            throw new Error('Not implemented');
        }
    }

    return trainingData;
}

function applyRandomChoice(board: Board): Board | undefined {
    const choices = board.findChoices(getRandomPieceType());

    if (choices.length === 0) {
        return undefined;
    }

    return choices[Math.floor(Math.random() * choices.length)];
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
