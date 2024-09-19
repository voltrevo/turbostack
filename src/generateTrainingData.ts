// Assuming Board, PieceType, and other necessary classes and functions are imported
import { Board, MlInputData } from './Board';
import { PieceType, ALL_PIECE_TYPES } from './PieceType';

// The evalBoard function predicts the final score from the given board
type EvalBoardFunction = (board: Board) => number;

// The output type of generateTrainingData
type TrainingDataPair = {
    mlInputData: MlInputData;
    finalScore: number;
}

/**
 * Generates training data for machine learning.
 * @param evalBoard - Function that evaluates a board and predicts the final score.
 * @param n - Number of games to simulate.
 * @returns Array of training data pairs (mlData, finalScore).
 */
export function generateTrainingData(evalBoard: EvalBoardFunction, n: number): TrainingDataPair[] {
    const trainingData: TrainingDataPair[] = [];

    for (let gameIndex = 0; gameIndex < n; gameIndex++) {
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
            const evaluatedChoices = choices.map(choice => ({
                board: choice,
                evalScore: evalBoard(choice),
            }));

            // Find the board with the highest evalScore
            evaluatedChoices.sort((a, b) => b.evalScore - a.evalScore);
            const bestChoice = evaluatedChoices[0].board;

            // Update the board to the best choice
            board = bestChoice;
        }

        // Get the final score of the game
        const finalScore = board.score;

        if (positions.length === 0) {
            throw new Error('Should not be possible');
        }

        // Pick one position at random from the game
        const randomIndex = Math.floor(Math.random() * positions.length);
        const randomPosition = positions[randomIndex];

        // Get the mlData from the randomly selected position
        const mlInputData = randomPosition.toMlInputData();

        // Add the pair to the training data
        trainingData.push({
            mlInputData,
            finalScore,
        });
    }

    return trainingData;
}

// Helper function to get a random PieceType
function getRandomPieceType(): PieceType {
    const randomIndex = Math.floor(Math.random() * ALL_PIECE_TYPES.length);
    return ALL_PIECE_TYPES[randomIndex];
}
