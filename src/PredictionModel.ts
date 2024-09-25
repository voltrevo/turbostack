import fs from 'fs/promises';

import * as tf from '@tensorflow/tfjs-node';
import { evalNodeCount, extraFeatureLen, useBoard } from './hyperParams';
import { exists } from './exists';
import { SplitDataSet } from './SplitDataSet';
import { Board } from './Board';
import { BoardEvaluator } from './BoardEvaluator';
import { ALL_PIECE_TYPES, PIECE_GRIDS } from './PieceType';

export type PredictionModelDataPoint = {
    from: Board;
    to: Board;
};

const spatialShape = [21, 12, 1];
const extraShape = [extraFeatureLen];

export class PredictionModel {
    constructor(
        public evalModel: tf.LayersModel,
        public combinedModel: tf.LayersModel,
    ) {
        combinedModel.compile({
            optimizer: 'adam',
            loss: 'categoricalCrossentropy',
        });
    }

    static createEvalModel(): tf.LayersModel {
        const boardInput = tf.input({ shape: [21, 12, 1] });
        const paramsInput = tf.input({ shape: [extraFeatureLen] });

        let tensor = tf.layers.conv2d({
            filters: 8,
            kernelSize: 4,
            activation: 'relu',
        }).apply(boardInput) as tf.SymbolicTensor;

        tensor = tf.layers.conv2d({
            filters: 16,
            kernelSize: [1, 9],
        }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.flatten().apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.concatenate().apply([tensor, paramsInput]) as tf.SymbolicTensor;

        tensor = tf.layers.dense({
            units: 16,
            activation: 'relu',
        }).apply(tensor) as tf.SymbolicTensor;

        // tensor = tf.layers.dropout({ rate: 0.2 }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.dense({
            units: 1,
            activation: 'relu',
        }).apply(tensor) as tf.SymbolicTensor;

        const model = tf.model({ inputs: [boardInput, paramsInput], outputs: tensor });

        return model;
    }

    static createCombinedModel(evalModel: tf.LayersModel) {
        const inputs = [];
        const evals = [];

        for (let i = 0; i < evalNodeCount; i++) {
            const spatialInput = tf.input({ shape: spatialShape });
            const extraInput = tf.input({ shape: extraShape });

            evals.push(evalModel.apply([spatialInput, extraInput]) as tf.SymbolicTensor);

            inputs.push(spatialInput);
            inputs.push(extraInput);
        }

        let tensor = tf.layers.concatenate().apply(evals);
        tensor = tf.layers.activation({ activation: 'softmax' }).apply(tensor);

        return tf.model({
            inputs,
            outputs: tensor as tf.SymbolicTensor,
        });
    }

    async save() {
        await fs.mkdir('data/predictionModel', { recursive: true });
        await this.evalModel.save('file://data/predictionModel');
    }

    static async load() {
        let evalModel;

        if (!(await exists('data/predictionModel'))) {
            evalModel = PredictionModel.createEvalModel();
        } else {
            evalModel = await tf.loadLayersModel('file://data/predictionModel/model.json');
        }

        const combinedModel = PredictionModel.createCombinedModel(evalModel);

        return new PredictionModel(evalModel, combinedModel);
    }

    async train(
        trainingData: SplitDataSet<PredictionModelDataPoint>,
        epochs: number,
    ) {
        const data = PredictionModel.prepareTrainingData(trainingData.data);
        const valData = PredictionModel.prepareTrainingData(trainingData.valData);
    
        await this.combinedModel.fit(data.xs, data.ys, {
            epochs,
            batchSize: 32,
            validationData: [valData.xs, valData.ys],
            callbacks: [
                // tf.callbacks.earlyStopping({
                //     monitor: 'val_loss',
                //     patience: 50,
                // }),
            ],
        });
    
        console.log("Training complete.");
    }

    createBoardEvaluator(): BoardEvaluator {
        return (boards: Board[]): number[] => {
            const mlInputData = boards.map(b => b.toMlInputData());

            // Extract boards, scores, and lines remaining from the input boards
            const boardData: number[][][][] = mlInputData.map(d => d.boardData);
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
            const evals = this.evalModel.predict(inputTensors) as tf.Tensor;

            // Get the evals as a flat array
            // Convert Float32Array to a normal array
            return Array.from(evals.dataSync());
        };
    }

    static prepareTrainingData(trainingData: PredictionModelDataPoint[]) {
        const xs: unknown[][] = [...new Array(2 * evalNodeCount)].map(() => []);
        const ys: number[][] = [];

        for (let { from, to } of trainingData) {
            const pieceType = detectPiece({ from, to });

            to = to.clone();
            to.removeClears();

            const choices = from.findChoices(pieceType);

            let toIndex: number | undefined = undefined;

            for (const [i, c] of choices.entries()) {
                if (Board.equal(c, to)) {
                    toIndex = i;
                }
            }

            if (toIndex === undefined) {
                throw new Error('No choices matched `to` board');
            }

            const choicesExpanded = expandChoices(choices);

            const currLabels: number[] = [];

            for (const [i, c] of choicesExpanded.entries()) {
                currLabels.push(i === toIndex ? 1 : 0);

                const mlInputData = c.toMlInputData();
                xs[2 * i + 0].push(mlInputData.boardData);
                xs[2 * i + 1].push(mlInputData.extraFeatures);
            }

            ys.push(currLabels);
        }
    
        return {
            xs: xs.map((x, i) => tf.tensor(x as any).reshape(
                i % 2 === 0
                    ? [trainingData.length, 21, 12, 1]
                    : [trainingData.length, extraFeatureLen]
            )),
            ys: tf.tensor(ys).reshape([trainingData.length, evalNodeCount]),
        };
    }

    static dataSet(): SplitDataSet<PredictionModelDataPoint> {
        return new SplitDataSet(
            'predictionModelData',
            ({ from, to }) => ({
                from: from.toJson(),
                to: to.toJson(),
            }),
            ({ from, to }: any) => ({
                from: Board.fromJson(from),
                to: Board.fromJson(to),
            }),
        );
    }

    static async loadDataSet(): Promise<SplitDataSet<PredictionModelDataPoint>> {
        const dataSet = PredictionModel.dataSet();
        await dataSet.load();

        return dataSet;
    }
}

type IJ = { i: number, j: number };

function detectPiece({ from, to }: PredictionModelDataPoint) {
    let start: IJ | undefined = undefined;
    const relPositions = [];

    for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 10; j++) {
            if (to.get(i, j) && !from.get(i, j)) {
                if (start === undefined) {
                    start = { i, j };
                } else {
                    relPositions.push({
                        i: i - start.i,
                        j: j - start.j,
                    });
                }
            }
        }
    }

    if (relPositions.length !== 3) {
        throw new Error(`Failed to find 4 blocks in tetromino`);
    }

    for (let pieceIndex = 0; pieceIndex < detectPieceStaticData.length; pieceIndex++) {
        for (const piecePattern of detectPieceStaticData[pieceIndex]) {
            let match = true;

            for (let x = 0; x < 3; x++) {
                if (
                    relPositions[x].i !== piecePattern[x].i ||
                    relPositions[x].j !== piecePattern[x].j
                ) {
                    match = false;
                    break;
                }
            }

            if (match) {
                return ALL_PIECE_TYPES[pieceIndex];
            }
        }
    }

    throw new Error('Failed to detect piece');
}

const detectPieceStaticData = (() => ALL_PIECE_TYPES.map(
    (pieceType) => PIECE_GRIDS[pieceType].map((g => {
        let start: IJ | undefined = undefined;
        const relPositions = [];

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const bit = (g & (1 << (4 * i + j))) !== 0;

                if (bit) {
                    if (start === undefined) {
                        start = { i, j };
                    } else {
                        relPositions.push({
                            i: i - start.i,
                            j: j - start.j,
                        });
                    }
                }
            }
        }

        if (relPositions.length !== 3) {
            throw new Error('Failed to find 4 blocks in tetromino');
        }

        return relPositions as [IJ, IJ, IJ];
    })),
))();

function expandChoices(choices: Board[]) {
    if (choices.length > evalNodeCount) {
        throw new Error('Too many choices, consider increasing evalNodeCount');
    }

    while (choices.length < evalNodeCount) {
        choices.push(Board.checkerboard);
    }

    return choices;
}
