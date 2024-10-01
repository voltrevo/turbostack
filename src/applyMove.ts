import { Board } from "./Board";
import { BoardEvaluator } from "./BoardEvaluator";
import { artificialHeightLimit } from "./hyperParams";
import { getRandomPieceType } from "./PieceType";

export async function applyMove(board: Board, boardEvaluator: BoardEvaluator) {
    if (board.finished) {
        return board;
    }

    if (board.maxHeight() > artificialHeightLimit) {
        return board;
    }

    // Select a random piece type
    const pieceType = getRandomPieceType();

    // Find all possible choices for this piece
    const choices = board.findChoices(pieceType);

    if (choices.length === 0) {
        // No moves available, end the game
        board = board.clone();
        board.finished = true;
        return board;
    }

    // Use evalBoard to evaluate each possible board
    const evaluatedChoices = await boardEvaluator(choices);
    const bestEval = Math.max(...evaluatedChoices);
    const bestEvalIndex = evaluatedChoices.indexOf(bestEval);

    if (bestEvalIndex < 0) {
        throw new Error('Should not be possible');
    }

    return choices[bestEvalIndex];
}

export async function applyNMoves(board: Board, boardEvaluator: BoardEvaluator, n: number) {
    for (let i = 0; i < n; i++) {
        board = await applyMove(board, boardEvaluator);

        if (board.finished) {
            break;
        }
    }

    return board;
}
