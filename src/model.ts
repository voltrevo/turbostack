import * as tf from '@tensorflow/tfjs-node';
import { Board } from './Board';

type Tensorish = tf.SymbolicTensor | tf.Tensor<tf.Rank> | tf.Tensor<tf.Rank>[] | tf.SymbolicTensor[];

export function createModel() {
    // Input for the Tetris board (20x10 binary matrix with boundary data)
    let tensor = tf.input({ shape: [20, 10, 2] });

    const boardInput = tensor;

    // // Convolutional layers to process the input (board + boundary)
    tensor = tf.layers.conv2d({ filters: 16, kernelSize: 4, activation: 'relu' }).apply(tensor) as tf.SymbolicTensor;
    tensor = tf.layers.maxPooling2d({ poolSize: [2, 2] }).apply(tensor) as tf.SymbolicTensor;

    tensor = tf.layers.conv2d({ filters: 32, kernelSize: 3, activation: 'relu' }).apply(tensor) as tf.SymbolicTensor;
    tensor = tf.layers.maxPooling2d({ poolSize: [2, 2] }).apply(tensor) as tf.SymbolicTensor;

    // // // Flatten and fully connected layers
    const flatten = tf.layers.flatten().apply(tensor);

    // Input for the extra features (lines remaining, current score)
    const extraInput = tf.input({ shape: [1] });

    // Combine the outputs of the two branches
    tensor = tf.layers.concatenate().apply([flatten as tf.SymbolicTensor, extraInput]) as tf.SymbolicTensor;

    // Fully connected layers
    tensor = tf.layers.dense({ units: 32, activation: 'relu' }).apply(tensor) as tf.SymbolicTensor;
    tensor = tf.layers.dense({ units: 16, activation: 'relu' }).apply(tensor) as tf.SymbolicTensor;

    // Output layer for score prediction
    const output = tf.layers.dense({ units: 1 }).apply(tensor);

    // Create and compile the model
    const model = tf.model({ inputs: [boardInput, extraInput], outputs: output as tf.SymbolicTensor });

    model.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError'
    });

    return model;
};

export type Model = ReturnType<typeof createModel>;

export function createBoardEvaluator(model: Model): (boards: Board[]) => number[] {
    return (boards: Board[]): number[] => {
        const mlInputData = boards.map(b => b.toMlInputData());

        // Extract boards, scores, and lines remaining from the input boards
        const boardData: number[][][][] = mlInputData.map(d => d.boardData);
        const extraData: number[][] = mlInputData.map(d => [d.linesRemaining, ...d.otherFeatures]);

        // Prepare tensors for the model
        const boardTensor = tf.tensor(boardData).reshape([boards.length, 20, 10, 2]);  // Shape: [batchSize, rows, cols, channels]
        const extraTensor = tf.tensor(extraData).reshape([boards.length, 1]);          // Shape: [batchSize, 2]

        // Perform batch inference
        const predictions = model.predict([boardTensor, extraTensor]) as tf.Tensor;

        // Extract the predicted scores from the tensor
        const predictedScores = predictions.dataSync();  // Get the predictions as a flat array

        return Array.from(predictedScores).map((p, i) => boards[i].score + p);  // Convert Float32Array to a normal array
    };
}
