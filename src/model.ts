import * as tf from '@tensorflow/tfjs-node';
import { Board } from './Board';
import { extraFeatureLen, useBoard } from '../programs/helpers/hyperParams';
import { BoardEvaluator } from './generateTrainingData';

// type Tensorish = tf.SymbolicTensor | tf.Tensor<tf.Rank> | tf.Tensor<tf.Rank>[] | tf.SymbolicTensor[];

export function createModel() {
    const inputs: tf.SymbolicTensor[] = [];
    const inputsToFinalLayers: tf.SymbolicTensor[] = [];

    if (useBoard) {
        // Input for the Tetris board (20x10 binary matrix with boundary data)
        let tensor = tf.input({ shape: [21, 12, 1] });

        const boardInput = tensor;
        inputs.push(boardInput);

        // // Convolutional layers to process the input (board + boundary)
        tensor = tf.layers.conv2d({ filters: 8, kernelSize: 4, activation: 'relu' }).apply(tensor) as tf.SymbolicTensor;
        // tensor = tf.layers.maxPooling2d({ poolSize: [2, 2] }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.conv2d({
            filters: 16,
            kernelSize: [1, 9],
            activation: 'relu',
        }).apply(tensor) as tf.SymbolicTensor;
        // tensor = tf.layers.maxPooling2d({ poolSize: [2, 2] }).apply(tensor) as tf.SymbolicTensor;

        // Flatten and fully connected layers
        tensor = tf.layers.flatten().apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.dense({ units: 16, activation: 'relu' }).apply(tensor) as tf.SymbolicTensor;

        inputsToFinalLayers.push(tensor);
    }

    // Input for the extra features (lines remaining, current score)
    const extraInput = tf.input({ shape: [extraFeatureLen] });
    inputs.push(extraInput);

    inputsToFinalLayers.push(extraInput);

    let tensor;

    if (inputsToFinalLayers.length > 1) {
        // Combine the outputs of the two branches
        tensor = tf.layers.concatenate().apply(inputsToFinalLayers) as tf.SymbolicTensor;
    } else if (inputsToFinalLayers.length === 1) {
        tensor = inputsToFinalLayers[0];
    } else {
        throw new Error('unexpected len');
    }

    // Fully connected layers
    tensor = tf.layers.dense({ units: 8, activation: 'relu' }).apply(tensor) as tf.SymbolicTensor;
    // tensor = tf.layers.dropout({ rate: 0.3 }).apply(tensor);

    // tensor = tf.layers.dense({ units: 16, activation: 'relu' }).apply(tensor) as tf.SymbolicTensor;
    // tensor = tf.layers.dropout({ rate: 0.3 }).apply(tensor);

    // Output layer for score prediction
    const output = tf.layers.dense({ units: 1 }).apply(tensor);

    // Create and compile the model
    const model = tf.model({ inputs, outputs: output as tf.SymbolicTensor });

    model.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError'
    });

    model.summary();

    return model;
};

export type Model = ReturnType<typeof createModel>;

export function createBoardEvaluator(model: Model): (boards: Board[]) => number[] {
    return (boards: Board[]): number[] => {
        const mlInputData = boards.map(b => b.toMlInputData());

        // Extract boards, scores, and lines remaining from the input boards
        const boardData: number[][][][] = mlInputData.map(d => d.boardData);
        const extraData: number[][] = mlInputData.map(d => [...d.extraFeatures]);

        // Prepare tensors for the model
        const inputTensors: tf.Tensor<tf.Rank>[] = [];

        if (useBoard) {
            inputTensors.push(
                // Shape: [batchSize, rows, cols, channels]
                tf.tensor(boardData).reshape([boards.length, 21, 12, 1]),
            );
        }

        inputTensors.push(
            // Shape: [batchSize, extraFeatureLen]
            tf.tensor(extraData).reshape([boards.length, extraFeatureLen]),
        );

        // Perform batch inference
        const predictions = model.predict(inputTensors) as tf.Tensor;

        // Extract the predicted scores from the tensor
        // Get the predictions as a flat array
        const predictedRemainingScores = predictions.dataSync();

        // Convert Float32Array to a normal array
        return Array.from(predictedRemainingScores)
            .map((p, i) => boards[i].score + p); // add current score to remaining prediction
    };
}

export const randomBoardEvaluator: BoardEvaluator = (boards: Board[]): number[] => {
    return boards.map(_b => Math.random());
}
