import { Board } from '../src/Board';
import { Piece, PieceType, ALL_PIECE_TYPES } from '../src/PieceType';

// Function to get a random PieceType
function getRandomPieceType(): PieceType {
    const randomIndex = Math.floor(Math.random() * ALL_PIECE_TYPES.length);
    return ALL_PIECE_TYPES[randomIndex];
}

// Function to print the board differences
function printBoardDifference(prevBoard: Board | null, currBoard: Board): void {
    if (prevBoard === null) {
        console.log(currBoard.toString());
    } else {
        console.log(currBoard.toStringDiff(prevBoard));
    }
}

// Main function to run the game
function main(): void {
    let board = new Board(40); // You can set lines_cleared_max as desired
    let previousBoard: Board | null = null;

    while (!board.finished) {
        const pieceType = getRandomPieceType();
        const choices = board.findChoices(pieceType);

        if (choices.length === 0) {
            console.log('No more choices available. Game Over.');
            break;
        }

        const randomChoiceIndex = Math.floor(Math.random() * choices.length);
        const newBoard = choices[randomChoiceIndex];

        printBoardDifference(previousBoard, newBoard);

        previousBoard = board;
        board = newBoard;
    }

    console.log('Game Finished.');
}

// Run the main function
main();