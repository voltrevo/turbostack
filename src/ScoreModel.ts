import fs from 'fs/promises';

import * as tf from '@tensorflow/tfjs-node';
import { extraFeatureLen } from './hyperParams';
import { exists } from './exists';
import { SplitDataSet } from './SplitDataSet';
import { Board, MlInputData } from './Board';
import { BoardEvaluator } from './BoardEvaluator';
import { PredictionModel } from './PredictionModel';

export type ScoreModelDataPoint = {
    board: Board;
    finalScore: number;
};

const learningRate = 0.00003;

export class ScoreModel {
    constructor(public tfModel: tf.LayersModel) {}

    static async create(): Promise<ScoreModel> {
        const predictionModel = await PredictionModel.load(true);
        const baseModel = predictionModel.evalModel;

        baseModel.layers.forEach(layer => {
            layer.trainable = false;
        });

        let tensor = baseModel.layers[baseModel.layers.length - 3].output;

        tensor = tf.layers.dense({
            units: 16,
            name: 'newDense1',
        }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.leakyReLU({
            alpha: 0.01,
            name: 'newLeakyReLU1',
        }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.dense({
            units: 16,
            name: 'newDense1.5',
        }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.leakyReLU({
            alpha: 0.01,
            name: 'newLeakyReLU1.5',
        }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.dense({
            units: 2,
            name: 'newDense2',
        }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.leakyReLU({
            alpha: 0.01,
            name: 'newLeakyReLU2',
        }).apply(tensor) as tf.SymbolicTensor;

        const model = tf.model({ inputs: baseModel.inputs, outputs: tensor });

        model.compile({
            optimizer: tf.train.adam(learningRate),
            loss: negativeLogLikelihood,
        });

        model.summary();

        return new ScoreModel(model);
    }

    async save() {
        await fs.mkdir('data/scoreModel', { recursive: true });
        await this.tfModel.save('file://data/scoreModel');
    }

    static async load() {
        if (!(await exists('data/scoreModel'))) {
            return await ScoreModel.create();
        }

        const model = await tf.loadLayersModel('file://data/scoreModel/model.json');

        model.compile({
            optimizer: 'adam',
            loss: negativeLogLikelihood,
        });

        return new ScoreModel(model);
    }

    async train(
        trainingData: SplitDataSet<ScoreModelDataPoint>,
        epochs: number,
    ) {
        const data = ScoreModel.prepareTrainingData(trainingData.data);
        const valData = ScoreModel.prepareTrainingData(trainingData.valData);

        await this.tfModel.fit(data.xs, data.ys, {
            epochs,
            batchSize: 32,
            validationData: [valData.xs, valData.ys],
            verbose: 1,
            callbacks: [
                tf.callbacks.earlyStopping({
                    monitor: 'val_loss',
                    patience: 20,
                }),
                new CustomLogger(),
            ],
        });

        console.log("Training complete.");
    }

    calculateValLoss(trainingData: SplitDataSet<ScoreModelDataPoint>) {
        // Prepare validation data
        const valData = ScoreModel.prepareTrainingData(trainingData.valData);

        // Get predictions from the model
        const predictions = this.tfModel.predict(valData.xs) as tf.Tensor2D;

        // Extract the actual validation labels (ys)
        const yTrue = valData.ys;

        // Compute negative log-likelihood loss for the validation data
        const valLossTensor = negativeLogLikelihood(yTrue, predictions);

        // Sum up the loss values
        const valLossSum = valLossTensor.sum().dataSync()[0];

        // Clean up tensors to avoid memory leaks
        valLossTensor.dispose();
        predictions.dispose();

        // Return average validation loss
        return valLossSum / valData.xs[0].shape[0];
    }

    createBoardEvaluator(): BoardEvaluator {
        return (boards: Board[]): number[] => {
            return this.predictMeanStdev(boards).map(({ mean }) => mean);
        };
    }

    predictMeanStdev(boards: Board[]): { mean: number; stdev: number }[] {
        const mlInputData = boards.map(b => b.toMlInputData());

        // Extract boards, scores, and lines remaining from the input boards
        const boardData: Uint8Array[] = mlInputData.map(d => d.boardData);
        const extraData: number[][] = mlInputData.map(d => [...d.extraFeatures]);

        // Prepare tensors for the model
        const inputTensors: tf.Tensor<tf.Rank>[] = [];

        inputTensors.push(
            // Shape: [batchSize, rows, cols, channels]
            tf.tensor(boardData).reshape([boards.length, 21, 12, 1]),
        );

        inputTensors.push(
            // Shape: [batchSize, extraFeatureLen]
            tf.tensor(extraData).reshape([boards.length, extraFeatureLen]),
        );

        // Perform batch inference
        const predictions = this.tfModel.predict(inputTensors) as tf.Tensor;

        // predictions is [mean, stdev][], we want mean[]
        const means = predictions.slice([0, 0], [-1, 1]).dataSync();
        const stdevs = predictions.slice([0, 1], [-1, 1]).dataSync();

        inputTensors.forEach(t => t.dispose());
        predictions.dispose();

        return Array.from({ length: boards.length }, (_, i) => ({
            mean: means[i],
            stdev: stdevs[i],
        }));
    }

    static prepareTrainingData(trainingData: ScoreModelDataPoint[]) {
        const boardData: MlInputData['boardData'][] = [];
        const extraData: number[][] = [];
        const labels: [number, number][] = [];

        trainingData.forEach(({ board, finalScore }) => {
            const { boardData: currBoardData, extraFeatures } = board.toMlInputData();

            // Use the board data directly, as it is already in the [row][column][channel] format
            boardData.push(currBoardData);
            extraData.push([...extraFeatures]);

            labels.push([finalScore, 0]);
        });

        const boardXs = tf.tensor(boardData).reshape([trainingData.length, 21, 12, 1]);
        const extraXs = tf.tensor(extraData).reshape([trainingData.length, extraFeatureLen]);

        const xs = [];

        xs.push(boardXs);
        xs.push(extraXs);

        return {
            xs,
            ys: tf.tensor(labels).reshape([trainingData.length, 2])
        };
    }

    static dataSet(tags: (number | string)[] = []): SplitDataSet<ScoreModelDataPoint> {
        return new SplitDataSet(
            ['scoreModelData', ...tags].join('-'),
            ({ board, finalScore }) => ({
                board: board.toJson(),
                finalScore,
            }),
            ({ board, finalScore }: any) => ({
                board: Board.fromJson(board),
                finalScore: finalScore,
            }),
        );
    }

    static async loadDataSet(): Promise<SplitDataSet<ScoreModelDataPoint>> {
        const dataSet = ScoreModel.dataSet();
        await dataSet.load();

        return dataSet;
    }
}

function negativeLogLikelihood(yTrue: tf.Tensor, yPred: tf.Tensor) {
    // Predicted mean and log(std)
    const mean = yPred.slice([0, 0], [-1, 1]);
    const logStd = yPred.slice([0, 1], [-1, 1]);

    // Actual y values from yTrue (first column)
    const yTrueValue = yTrue.slice([0, 0], [-1, 1]);

    // Convert log(std) to std
    const std = tf.add(tf.softplus(logStd), 100); // Ensure positive std
    const variance = tf.square(std);

    // Negative log-likelihood computation
    const logLikelihood = tf.add(
        tf.div(tf.square(tf.sub(yTrueValue, mean)), tf.mul(2, variance)), // (yTrue - mean)^2 / (2 * variance)
        tf.log(std) // log(std)
    ).add(0.5 * Math.log(2 * Math.PI)); // Constant term

    // Return mean negative log-likelihood
    return tf.mean(logLikelihood);
}

class CustomLogger extends tf.CustomCallback {
    constructor() {
        super({});
    }

    async onEpochEnd(epoch: number, logs?: tf.Logs) {
        if (logs) {
            const loss = logs.loss?.toFixed(6); // More decimal places
            const valLoss = logs.val_loss?.toFixed(6); // More decimal places
            console.log(`Epoch ${epoch + 1}: loss=${loss}, val_loss=${valLoss}`);
        }
    }
}
