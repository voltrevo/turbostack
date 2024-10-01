// Assuming Board, PieceType, and other necessary classes and functions are imported
import { nPlayoutsToAvg, sampleDepth, samplesPerGame, stdMaxLines } from './hyperParams';
import { Board } from './Board';
import { generateGameBoards } from './generateGameBoards';
import { getRandomPieceType } from './PieceType';
import { ScoreModelDataPoint } from './ScoreModel';
import { BoardEvaluator } from './BoardEvaluator';
import { applyNMoves } from './applyMove';
import Stats from './Stats';

/**
 * Generates training data for machine learning.
 * @param boardEvaluator - Function that evaluates a board and predicts the final score.
 * @param n - Number of games to simulate.
 * @returns Array of training data pairs (mlData, finalScore).
 */
export async function generateScoreTrainingData(
    boardEvaluator: BoardEvaluator,
): Promise<ScoreModelDataPoint[]> {
    const trainingData: ScoreModelDataPoint[] = [];

    let { positions } = await generateGameBoards(new Board(stdMaxLines), boardEvaluator);

    if (positions.length === 0) {
        throw new Error('Should not be possible');
    }

    for (let i = 0; i < samplesPerGame; i++) {
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
        trainingData.push(await augment({
            prevBoard,
            board: position,
            boardEvaluator: boardEvaluator,
        }));
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

async function augment({ prevBoard, board, boardEvaluator }: {
    prevBoard: Board;
    board: Board;
    boardEvaluator: BoardEvaluator;
}): Promise<ScoreModelDataPoint> {
    const scores = await Promise.all(
        Array.from({ length: nPlayoutsToAvg }).map(async () => {
            let altBoard = await applyNMoves(board, boardEvaluator, sampleDepth);;

            if (altBoard.finished) {
                return altBoard.score;
            }

            return (await boardEvaluator([altBoard]))[0];
        }),
    );

    const mean = Stats.mean(scores);
    const stdev = Stats.stdevSample(scores);

    return {
        prevBoard,
        board,
        finalScore: mean,
        finalScoreSamples: scores.map(s => Math.round(s)),
        scoreStdev: stdev,
    };
}
