import { Board } from '../src/Board';
import { PieceType, ALL_PIECE_TYPES } from '../src/PieceType';

// Function to get a random PieceType
function getRandomPieceType(): PieceType {
    const randomIndex = Math.floor(Math.random() * ALL_PIECE_TYPES.length);
    return ALL_PIECE_TYPES[randomIndex];
}

// Main function to run the game
function main(): void {
    let board = new Board(40); // You can set lines_cleared_max as desired
    let moves = 0;

    while (!board.finished) {
        const pieceType = getRandomPieceType();
        const choices = board.findChoices(pieceType);

        if (choices.length === 0) {
            console.log('No more choices available. Game Over.');
            break;
        }

        const randomChoiceIndex = Math.floor(Math.random() * choices.length);
        const newBoard = choices[randomChoiceIndex];
        moves++;

        console.log(newBoard.toStringDiff(board));

        board = newBoard;
    }

    console.log('Game Finished.');
}

// Run the main function
main();
