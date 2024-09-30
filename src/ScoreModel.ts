import fs from 'fs/promises';

import * as tf from '@tensorflow/tfjs-node';
import { extraFeatureLen, validationSplit } from './hyperParams';
import { exists } from './exists';
import { Board, MlInputData } from './Board';
import { BoardEvaluator } from './BoardEvaluator';
import { SplitDataSet2 } from './SplitDataSet2';
import { PredictionModel } from './PredictionModel';

export type ScoreModelDataPoint = {
    prevBoard?: Board;
    board: Board;
    finalScore: number;
    finalScoreSamples?: number[];
};

const learningRate = 0.001;

const spatialShape = [21, 12, 1];

export class ScoreModel {
    constructor(public tfModel: tf.LayersModel) {}

    static async create(): Promise<ScoreModel> {
        const boardInput = tf.input({ shape: spatialShape });
        const scoreInput = tf.input({ shape: [1] });
        const linesRemainingInput = tf.input({ shape: [1] });

        const featuresModel = (await PredictionModel.load(true)).featuresModel();

        for (const layer of featuresModel.layers) {
            layer.trainable = false;
        }
        
        let tensor = featuresModel.apply(boardInput) as tf.SymbolicTensor;

        tensor = tf.layers.flatten().apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.concatenate().apply([
            tensor,
            linesRemainingInput,
        ]) as tf.SymbolicTensor;

        tensor = tf.layers.dense({
            units: 16,
            name: 'score_dense1',
        }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.leakyReLU({
            alpha: 0.01,
            name: 'score_leaky1',
        }).apply(tensor) as tf.SymbolicTensor;

        let prev = tensor;

        tensor = tf.layers.dense({
            units: 16,
            name: 'score_dense2',
        }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.leakyReLU({
            alpha: 0.01,
            name: 'score_leaky2',
        }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.add().apply([tensor, prev]) as tf.SymbolicTensor;

        tensor = tf.layers.dense({
            units: 1,
            name: 'score_preoutput',
        }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.add().apply([tensor, scoreInput]) as tf.SymbolicTensor;

        const model = tf.model({
            inputs: [
                boardInput,
                scoreInput,
                linesRemainingInput,
            ],
            outputs: tensor,
        });

        model.summary();

        model.compile({
            optimizer: tf.train.adam(learningRate),
            loss: 'meanSquaredError',
        });

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
            optimizer: tf.train.adam(learningRate),
            loss: 'meanSquaredError',
        });

        return new ScoreModel(model);
    }

    async train(
        trainingData: SplitDataSet2<ScoreModelDataPoint>,
        epochs: number,
    ) {
        const split = trainingData.all(validationSplit);
        const data = ScoreModel.prepareTrainingData(split.data);
        const valData = ScoreModel.prepareTrainingData(split.valData);

        await this.tfModel.fit(data.xs, data.ys, {
            epochs,
            batchSize: 1024,
            validationData: [valData.xs, valData.ys],
            verbose: 1,
            callbacks: [
                // tf.callbacks.earlyStopping({
                //     monitor: 'val_loss',
                //     patience: 20,
                // }),
                new CustomLogger(),
            ],
        });

        for (const d of [data, valData]) {
            for (const tensor of d.xs) {
                tensor.dispose();
            }
            
            d.ys.dispose();
        }

        console.log("Training complete.");
    }

    calculateValLoss(trainingData: SplitDataSet2<ScoreModelDataPoint>) {
        // Prepare validation data
        const valData = ScoreModel.prepareTrainingData(trainingData.all(validationSplit).valData);

        // Get predictions from the model
        const predictions = this.tfModel.predict(valData.xs) as tf.Tensor2D;

        // Extract the actual validation labels (ys)
        const yTrue = valData.ys;

        const valLossTensor = tf.metrics.meanSquaredError(yTrue, predictions);

        // Sum up the loss values
        const valLossSum = valLossTensor.sum().dataSync()[0];

        // Clean up tensors to avoid memory leaks
        valLossTensor.dispose();
        predictions.dispose();

        // Return average validation loss
        return Math.sqrt(valLossSum / valData.xs[0].shape[0]);
    }

    createBoardEvaluator(): BoardEvaluator {
        return (boards: Board[]): number[] => {
            return this.predictMean(boards).map(({ mean }) => mean);
        };
    }

    predictMean(boards: Board[]): { mean: number }[] {
        const mlInputData = boards.map(b => b.toMlInputData());

        // Extract boards, scores, and lines remaining from the input boards
        const boardData: Uint8Array[] = mlInputData.map(d => d.boardData);
        const scoreData: number[] = mlInputData.map(d => d.score);
        const linesRemainingData: number[] = mlInputData.map(d => d.linesRemaining);

        // Prepare tensors for the model
        const inputTensors: tf.Tensor<tf.Rank>[] = [
            tf.tensor(boardData).reshape([boards.length, 21, 12, 1]),
            tf.tensor(scoreData).reshape([boards.length, 1]),
            tf.tensor(linesRemainingData).reshape([boards.length, 1]),
        ];

        // Perform batch inference
        const predictions = this.tfModel.predict(inputTensors) as tf.Tensor;

        const means = predictions.dataSync();

        inputTensors.forEach(t => t.dispose());
        predictions.dispose();

        return Array.from({ length: boards.length }, (_, i) => ({
            mean: means[i],
        }));
    }

    static prepareTrainingData(trainingData: ScoreModelDataPoint[]) {
        const boardData: MlInputData['boardData'][] = [];
        const scoreData: number[] = [];
        const linesRemainingData: number[] = [];
        const labels: number[] = [];

        trainingData.forEach(({ board, finalScore }) => {
            const { boardData: currBoardData, score, linesRemaining } = board.toMlInputData();

            // Use the board data directly, as it is already in the [row][column][channel] format
            boardData.push(currBoardData);
            scoreData.push(score);
            linesRemainingData.push(linesRemaining);

            labels.push(finalScore);
        });

        const xs = [
            tf.tensor(boardData).reshape([trainingData.length, 21, 12, 1]),
            tf.tensor(scoreData).reshape([trainingData.length, 1]),
            tf.tensor(linesRemainingData).reshape([trainingData.length, 1]),
        ];

        return {
            xs,
            ys: tf.tensor(labels).reshape([trainingData.length, 1])
        };
    }

    static dataSet(): SplitDataSet2<ScoreModelDataPoint> {
        return new SplitDataSet2<ScoreModelDataPoint>(
            'scoreModelData',
            Infinity,
            ({ board, finalScore, finalScoreSamples }) => ({
                board: board.toJson(),
                finalScore,
                finalScoreSamples,
            }),
            ({ board, finalScore, finalScoreSamples }: any) => ({
                board: Board.fromJson(board),
                finalScore: finalScore,
                finalScoreSamples,
            }),
        );
    }

    static async loadDataSet(): Promise<SplitDataSet2<ScoreModelDataPoint>> {
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
            // const loss = logs.loss?.toFixed(6); // More decimal places
            // const valLoss = logs.val_loss?.toFixed(6); // More decimal places
            console.log(`Epoch ${epoch + 1}: loss=${Math.sqrt(logs.loss).toFixed(2)}, val_loss=${Math.sqrt(logs.val_loss).toFixed(2)}`);
        }
    }
}
