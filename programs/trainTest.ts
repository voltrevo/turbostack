import * as tf from '@tensorflow/tfjs-node';
import { trainModel } from '../src/train'; // Assume your model is in `trainModel.ts`

type MlInputData = {
    board: number[][][];
    score: number;
    linesRemaining: number;
};

type TrainingDataPair = {
    mlInputData: MlInputData;
    finalScore: number;
};

// Utility function to generate random board data
const generateRandomBoard = (): number[][][] => {
    const board = [];
    const p = Math.random();
    for (let i = 0; i < 20; i++) {
        const row = [];
        for (let j = 0; j < 10; j++) {
            // Generate a random binary value (0 or 1) for each cell
            row.push([Math.random() < p ? 1 : 0, 0]); // Channel 0: Cell data, Channel 1: Boundary data (not needed in this case)
        }
        board.push(row);
    }
    return board;
};

// Generate training data
const generateTrainingData = (numSamples: number): TrainingDataPair[] => {
    const trainingData: TrainingDataPair[] = [];

    for (let i = 0; i < numSamples; i++) {
        const board = generateRandomBoard();
        const filledCells = board.flat(2).filter(cell => cell === 1).length; // Count the filled cells

        const mlInputData: MlInputData = {
            board,
            score: Math.floor(Math.random() * 1000), // Random score
            linesRemaining: Math.floor(Math.random() * 10) // Random lines remaining
        };

        trainingData.push({
            mlInputData,
            finalScore: filledCells // Use the number of filled cells as the final score
        });
    }

    return trainingData;
};

// Test the model
async function testModel() {
    const trainingData = generateTrainingData(1_000); // Generate 100 training samples

    // Train the model
    console.log("Training the model...");
    const model = await trainModel(undefined, trainingData);

    // Generate some test data
    const testData = generateTrainingData(5); // Generate 5 test samples

    // Perform inference on the test data
    console.log("\nPerforming inference on test data...");
    testData.forEach(({ mlInputData, finalScore }, idx) => {
        const { board, score, linesRemaining } = mlInputData;

        // Prepare the input for the model
        const boardTensor = tf.tensor([board]).reshape([1, 20, 10, 2]); // Shape: [batchSize, rows, cols, channels]
        const extraTensor = tf.tensor([[linesRemaining, score]]); // Shape: [batchSize, 2]

        // Perform inference
        const prediction = model.predict([boardTensor, extraTensor]) as tf.Tensor;
        const predictedScore = prediction.dataSync()[0]; // Get the predicted score

        console.log(`Test sample ${idx + 1}:`);
        console.log(`  Filled cells (actual final score): ${finalScore}`);
        console.log(`  Predicted final score: ${predictedScore.toFixed(2)}\n`);
    });
}

testModel();
