import * as tf from '@tensorflow/tfjs-node';
import { TrainingDataPair } from './generateTrainingData';
import { MlInputData } from './Board';

const createModel = () => {
    // Input for the Tetris board (20x10 binary matrix with boundary data)
    const boardInput = tf.input({ shape: [20, 10, 2] });

    // Convolutional layers to process the input (board + boundary)
    const conv1 = tf.layers.conv2d({ filters: 32, kernelSize: 3, activation: 'relu' }).apply(boardInput);
    const pool1 = tf.layers.maxPooling2d({ poolSize: [2, 2] }).apply(conv1);

    const conv2 = tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: 'relu' }).apply(pool1);
    const pool2 = tf.layers.maxPooling2d({ poolSize: [2, 2] }).apply(conv2);

    // Flatten and fully connected layers
    const flatten = tf.layers.flatten().apply(pool2);

    // Input for the extra features (lines remaining, current score)
    const extraInput = tf.input({ shape: [2] });

    // Combine the outputs of the two branches
    const combined = tf.layers.concatenate().apply([flatten as tf.SymbolicTensor, extraInput]);

    // Fully connected layers
    const dense1 = tf.layers.dense({ units: 128, activation: 'relu' }).apply(combined);
    const dense2 = tf.layers.dense({ units: 64, activation: 'relu' }).apply(dense1);

    // Output layer for score prediction
    const output = tf.layers.dense({ units: 1 }).apply(dense2);

    // Create and compile the model
    const model = tf.model({ inputs: [boardInput, extraInput], outputs: output as tf.SymbolicTensor });

    model.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError'
    });

    return model;
};

type Model = ReturnType<typeof createModel>;

// Function to prepare the training data
const prepareTrainingData = (trainingData: TrainingDataPair[]) => {
    const boardData: MlInputData['board'][] = [];
    const extraData: [number, number][] = [];
    const labels: number[] = [];

    trainingData.forEach(({ mlInputData, finalScore }) => {
        const { board, score, linesRemaining } = mlInputData;

        // Use the board data directly, as it is already in the [row][column][channel] format
        boardData.push(board);
        extraData.push([linesRemaining, score]);
        labels.push(finalScore);
    });

    return {
        boardXs: tf.tensor(boardData).reshape([trainingData.length, 20, 10, 2]),
        extraXs: tf.tensor(extraData).reshape([trainingData.length, 2]),
        ys: tf.tensor(labels).reshape([trainingData.length, 1])
    };
};

// Training function
export async function trainModel(existingModel: Model | undefined, trainingData: TrainingDataPair[]) {
    const model = existingModel ?? createModel();

    const { boardXs, extraXs, ys } = prepareTrainingData(trainingData);

    await model.fit([boardXs, extraXs], ys, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2
    });

    console.log("Training complete.");

    return model;
};
