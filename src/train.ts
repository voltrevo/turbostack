import * as tf from '@tensorflow/tfjs-node';
import { TrainingDataPair } from './generateTrainingData';
import { MlInputData } from './Board';
import { createModel, Model } from './model';
import { extraFeatureLen, useBoard } from '../programs/helpers/hyperParams';

// Function to prepare the training data
export function prepareTrainingData(trainingData: TrainingDataPair[]) {
    const boardData: MlInputData['boardData'][] = [];
    const extraData: number[][] = [];
    const labels: number[] = [];

    trainingData.forEach(({ board, finalScore }) => {
        const { boardData: currBoardData, extraFeatures } = board.toMlInputData();

        // Use the board data directly, as it is already in the [row][column][channel] format
        boardData.push(currBoardData);
        extraData.push([...extraFeatures]);

        const scoreRemaining = finalScore - board.score
        labels.push(scoreRemaining);
    });

    return {
        boardXs: tf.tensor(boardData).reshape([trainingData.length, 20, 10, 2]),
        extraXs: tf.tensor(extraData).reshape([trainingData.length, extraFeatureLen]),
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

    const xs: tf.Tensor<tf.Rank>[] = [];

    if (useBoard) {
        xs.push(boardXs);
    }

    xs.push(extraXs);

    await model.fit(xs, ys, {
        epochs,
        batchSize: 32,
        validationSplit: 0.2
    });

    console.log("Training complete.");

    return model;
};
