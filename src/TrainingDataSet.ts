import * as tf from '@tensorflow/tfjs-node';

import { extraFeatureLen, useBoard, validationSplit } from "../programs/helpers/hyperParams";
import { loadTrainingData, saveTrainingData } from "../programs/helpers/modelStorage";
import { MlInputData } from "./Board";
import { TrainingDataPair } from "./generateTrainingData";

export class TrainingDataSet {
    data: TrainingDataPair[] = [];
    valData: TrainingDataPair[] = [];

    add(newData: TrainingDataPair[]) {
        const valCount = Math.ceil(newData.length * validationSplit);

        this.valData.push(...newData.slice(0, valCount));
        this.data.push(...newData.slice(valCount));
    }

    keepRecent(n: number) {
        const maxValDataN = Math.ceil(n * validationSplit);
        const maxDataN = n - maxValDataN;

        this.data = this.data.slice(-maxDataN);
        this.valData = this.valData.slice(-maxValDataN);
    }

    size() {
        return this.data.length + this.valData.length;
    }

    prepare() {
        return {
            data: prepareTrainingData(this.data),
            valData: prepareTrainingData(this.valData),
        };
    }

    sample(size: number) {
        if (size > this.size()) {
            throw new Error('Can\'t make a sample that size (not enough total data)');
        }

        const valSize = Math.ceil(size * validationSplit);
        const dataSize = size - valSize;

        const valOffset = Math.floor(Math.random() * (this.valData.length - valSize));
        const dataOffset = Math.floor(Math.random() * (this.data.length - dataSize));

        const res = new TrainingDataSet();
        res.data = this.data.slice(dataOffset, dataOffset + dataSize);
        res.valData = this.valData.slice(valOffset, valOffset + valSize);

        return res;
    }

    async save() {
        await saveTrainingData(this);
    }

    static async load() {
        const res = new TrainingDataSet();
        const saved = await loadTrainingData();

        if (saved !== undefined) {
            res.data = saved.data;
            res.valData = saved.valData;
        }

        return res;
    }
}

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

    const boardXs = tf.tensor(boardData).reshape([trainingData.length, 21, 12, 1]);
    const extraXs = tf.tensor(extraData).reshape([trainingData.length, extraFeatureLen]);

    const xs = [];

    if (useBoard) {
        xs.push(boardXs);
    }

    xs.push(extraXs);

    return {
        xs,
        ys: tf.tensor(labels).reshape([trainingData.length, 1])
    };
};
