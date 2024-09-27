import { artificialHeightLimit } from "./hyperParams";
import { Board } from "./Board";
import { getRandomPieceType } from "./PieceType";
import { BoardEvaluator } from "./BoardEvaluator";
import softmax from "./softmax";

export function generateGameBoards(board: Board, boardEvaluator: BoardEvaluator, temperature = 0) {
    const positions: Board[] = [];

    // enough for 1000 lines, should not be possible
    const maxGameIterations = 2500; // Prevent infinite loops

    while (true) {
        // Record the current board state
        positions.push(board.clone());

        if (board.finished) {
            break;
        }

        if (board.maxHeight() > artificialHeightLimit) {
            break;
        }

        if (positions.length === maxGameIterations) {
            throw new Error('This should not be possible');
        }

        // Select a random piece type
        const pieceType = getRandomPieceType();

        // Find all possible choices for this piece
        const choices = board.findChoices(pieceType);

        if (choices.length === 0) {
            // No moves available, end the game
            break;
        }

        // Use evalBoard to evaluate each possible board
        const evaluatedChoices = softmax(boardEvaluator(choices), temperature);

        let rand = Math.random();

        let newBoard: Board | undefined = undefined;

        for (let i = 0; i < evaluatedChoices.length; i++) {
            rand -= evaluatedChoices[i];

            if (rand <= 0) {
                newBoard = choices[i];
                break;
            }
        }

        if (!newBoard) {
            throw new Error('Should not be possible');
        }

        // Update the board to the best choice
        board = newBoard;
    }

    // Get the final score of the game
    let finalScore = board.score;

    // artificially add 1 to the score for each successfully placed piece
    // this is (hopefully) good for early learning which has no idea how
    // to score lines
    finalScore += positions.length;

    return { positions, finalScore };
}
