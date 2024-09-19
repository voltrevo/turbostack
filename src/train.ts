import * as tf from '@tensorflow/tfjs-node';
import { TrainingDataPair } from './generateTrainingData';
import { MlInputData } from './Board';
import { createModel, Model } from './model';

// Function to prepare the training data
export function prepareTrainingData(trainingData: TrainingDataPair[]) {
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
export async function trainModel(
    existingModel: Model | undefined,
    trainingData: TrainingDataPair[],
    epochs: number,
) {
    const model = existingModel ?? createModel();

    const { boardXs, extraXs, ys } = prepareTrainingData(trainingData);

    await model.fit([boardXs, extraXs], ys, {
        epochs,
        batchSize: 32,
        validationSplit: 0.2
    });

    console.log("Training complete.");

    return model;
};
