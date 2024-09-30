import fs from 'fs/promises';

import * as tf from '@tensorflow/tfjs-node';
import { extraFeatureLen, validationSplit } from './hyperParams';
import { exists } from './exists';
import { Board } from './Board';
import { BoardEvaluator } from './BoardEvaluator';
import { SplitDataSet2 } from './SplitDataSet2';
import { ScoreModelDataPoint } from './ScoreModel';

const learningRate = 0.001;

const extraShape = [extraFeatureLen];

export class MiniScoreModel {
    constructor(public tfModel: tf.LayersModel) {}

    static async create(): Promise<MiniScoreModel> {
        const paramsInput = tf.input({ shape: extraShape });

        let tensor = paramsInput;

        tensor = tf.layers.dense({
            units: 16,
            name: 'mini_dense1',
        }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.leakyReLU({
            alpha: 0.01,
            name: 'mini_leaky1',
        }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.dense({
            units: 1,
            name: 'mini_dense2',
        }).apply(tensor) as tf.SymbolicTensor;

        const model = tf.model({ inputs: [paramsInput], outputs: tensor });

        model.summary();

        model.compile({
            optimizer: tf.train.adam(learningRate),
            loss: 'meanSquaredError',
        });

        return new MiniScoreModel(model);
    }

    async save() {
        await fs.mkdir('data/miniScoreModel', { recursive: true });
        await this.tfModel.save('file://data/miniScoreModel');
    }

    static async load(mustExist = false) {
        if (!(await exists('data/miniScoreModel'))) {
            if (mustExist) {
                throw new Error('Model not found');
            }

            return await MiniScoreModel.create();
        }

        const model = await tf.loadLayersModel('file://data/miniScoreModel/model.json');

        model.compile({
            optimizer: tf.train.adam(learningRate),
            loss: 'meanSquaredError',
        });

        return new MiniScoreModel(model);
    }

    async train(
        trainingData: SplitDataSet2<ScoreModelDataPoint>,
        epochs: number,
    ) {
        const split = trainingData.all(validationSplit);
        const data = MiniScoreModel.prepareTrainingData(split.data);
        const valData = MiniScoreModel.prepareTrainingData(split.valData);

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
            ],
        });

        console.log("Training complete.");
    }

    calculateValLoss(trainingData: SplitDataSet2<ScoreModelDataPoint>) {
        // Prepare validation data
        const valData = MiniScoreModel.prepareTrainingData(trainingData.all(validationSplit).valData);

        // Get predictions from the model
        const predictions = this.tfModel.predict(valData.xs) as tf.Tensor2D;

        // Extract the actual validation labels (ys)
        const yTrue = valData.ys;

        const valLossTensor = tf.losses.meanSquaredError(yTrue, predictions);

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
            return this.predictMean(boards).map(({ mean }) => mean);
        };
    }

    predictMean(boards: Board[]): { mean: number }[] {
        const mlInputData = boards.map(b => b.toMlInputData());

        const extraData: number[][] = mlInputData.map(d => [...d.extraFeatures]);

        // Prepare tensors for the model
        const inputTensors: tf.Tensor<tf.Rank>[] = [];

        inputTensors.push(
            // Shape: [batchSize, extraFeatureLen]
            tf.tensor(extraData).reshape([boards.length, extraFeatureLen]),
        );

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
        const extraData: number[][] = [];
        const labels: number[] = [];

        trainingData.forEach(({ board, finalScore }) => {
            const { extraFeatures } = board.toMlInputData();

            extraData.push([...extraFeatures]);

            labels.push(finalScore);
        });

        const extraXs = tf.tensor(extraData).reshape([trainingData.length, extraFeatureLen]);

        const xs = [];

        xs.push(extraXs);

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
        const dataSet = MiniScoreModel.dataSet();
        await dataSet.load();

        return dataSet;
    }
}
