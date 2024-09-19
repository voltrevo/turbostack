import { Board } from "./Board";
import { BoardEvaluator } from "./generateTrainingData";
import { getRandomPieceType } from "./PieceType";

export function generateGameBoards(boardEvaluator: BoardEvaluator) {
    let board = new Board(130); // Adjust lines_cleared_max as needed
    const positions: Board[] = [];

    // enough for 1000 lines, should not be possible
    const maxGameIterations = 2500; // Prevent infinite loops

    while (!board.finished) {
        // Record the current board state
        positions.push(board.clone());

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
        const evaluatedChoices = boardEvaluator(choices).map((score, i) => [score, i]);

        // Find the board with the highest evalScore
        evaluatedChoices.sort((a, b) => b[0] - a[0]);
        const bestChoice = choices[evaluatedChoices[0][1]];

        // Update the board to the best choice
        board = bestChoice;
    }

    // Get the final score of the game
    let finalScore = board.score;

    // artificially add 1 to the score for each successfully placed piece
    // this is (hopefully) good for early learning which has no idea how
    // to score lines
    finalScore += positions.length;

    if (positions.length === 0) {
        throw new Error('Should not be possible');
    }

    return { positions, finalScore };
}