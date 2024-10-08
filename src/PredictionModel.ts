import fs from 'fs/promises';

import * as tf from '@tensorflow/tfjs-node';
import { evalNodeCount, extraFeatureLen } from './hyperParams';
import { exists } from './exists';
import { SplitDataSet } from './SplitDataSet';
import { Board } from './Board';
import { BoardEvaluator } from './BoardEvaluator';
import { ALL_PIECE_TYPES, PIECE_GRIDS } from './PieceType';
import BatchProcessor from './BatchProcessor';

export type PredictionModelDataPoint = {
    from: Board;
    to: Board;
};

const spatialShape = [21, 12, 1];
const extraShape = [extraFeatureLen];

export class PredictionModel {
    public learningRate: number;

    constructor(
        public evalModel: tf.LayersModel,
        public combinedModel: tf.LayersModel,
    ) {
        this.learningRate = 0.001;
        this.setLearningRate(this.learningRate);
    }

    static createEvalModel(): tf.LayersModel {
        const boardInput = tf.input({ shape: spatialShape });
        const paramsInput = tf.input({ shape: extraShape });

        let tensor = tf.layers.conv2d({
            filters: 8,
            kernelSize: [5, 3],
        }).apply(boardInput) as tf.SymbolicTensor;

        tensor = tf.layers.leakyReLU({ alpha: 0.01 }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.conv2d({
            filters: 16,
            kernelSize: [1, 10],
        }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.leakyReLU({ alpha: 0.01 }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.flatten().apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.concatenate().apply([
            tensor,
            paramsInput,
        ]) as tf.SymbolicTensor;

        tensor = tf.layers.dense({
            units: 16,
        }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.leakyReLU({ alpha: 0.01 }).apply(tensor) as tf.SymbolicTensor;

        let prev = tensor;

        tensor = tf.layers.dense({
            units: 16,
        }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.leakyReLU({ alpha: 0.01 }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.add().apply([tensor, prev]) as tf.SymbolicTensor;

        // tensor = tf.layers.dropout({ rate: 0.2 }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.dense({
            units: 1,
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

    static async load(mustExist = false) {
        let evalModel;

        if (!(await exists('data/predictionModel'))) {
            if (mustExist) {
                throw new Error('Model does not exist');
            }
            evalModel = PredictionModel.createEvalModel();
        } else {
            evalModel = await tf.loadLayersModel('file://data/predictionModel/model.json');
        }

        const combinedModel = PredictionModel.createCombinedModel(evalModel);

        return new PredictionModel(evalModel, combinedModel);
    }

    featuresModel(): tf.LayersModel {
        const boardInput = tf.input({ shape: spatialShape });

        let tensor = boardInput;

        for (const layer of this.evalModel.layers.slice(1, 5)) {
            tensor = layer.apply(tensor) as tf.SymbolicTensor;
        }
        
        return tf.model({ inputs: boardInput, outputs: tensor });
    }

    setLearningRate(learningRate: number) {
        this.learningRate = learningRate;

        this.combinedModel.compile({
            optimizer: tf.train.adam(learningRate),
            loss: 'categoricalCrossentropy',
        });
    }

    async train(
        trainingData: SplitDataSet<PredictionModelDataPoint>,
        epochs: number,
    ) {
        const data = PredictionModel.prepareTrainingData(trainingData.data);
        const valData = PredictionModel.prepareTrainingData(trainingData.valData);
    
        await this.combinedModel.fit(data.xs, data.ys, {
            epochs,
            batchSize: 128,
            validationData: [valData.xs, valData.ys],
            callbacks: [
                tf.callbacks.earlyStopping({
                    monitor: 'loss',
                    patience: 3,
                }),
            ],
        });
    
        console.log("Training complete.");
    }

    calculateLoss(trainingData: SplitDataSet<PredictionModelDataPoint>) {
        const data = PredictionModel.prepareTrainingData(trainingData.data);
        const predictions = this.combinedModel.predict(data.xs) as tf.Tensor;
        const loss = tf.metrics.categoricalCrossentropy(data.ys, predictions).sum().dataSync()[0];

        return loss / data.xs[0].shape[0];
    }

    calculateValLoss(trainingData: SplitDataSet<PredictionModelDataPoint>) {
        const valData = PredictionModel.prepareTrainingData(trainingData.valData);
        const predictions = this.combinedModel.predict(valData.xs) as tf.Tensor;
        const valLoss = tf.metrics.categoricalCrossentropy(valData.ys, predictions).sum().dataSync()[0];

        return valLoss / valData.xs[0].shape[0];
    }

    batchBoardEvaluator?: BoardEvaluator;

    createBoardEvaluator(): BoardEvaluator {
        if (!this.batchBoardEvaluator) {
            this.batchBoardEvaluator = BatchProcessor.create(
                boards => this.coreBoardEvaluator(boards),
                512,
            );
        }

        return this.batchBoardEvaluator;
    }

    coreBoardEvaluator(boards: Board[]): number[] {
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
        const evals = this.evalModel.predict(inputTensors) as tf.Tensor;

        // Get the evals as a flat array
        // Convert Float32Array to a normal array
        return Array.from(evals.dataSync());
    }

    static prepareTrainingData(trainingData: PredictionModelDataPoint[]) {
        const xs: unknown[][] = [...new Array(2 * evalNodeCount)].map(() => []);
        const ys: number[][] = [];

        let skips = 0;

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
                console.log(new Error('No choices matched `to` board'));
                skips++;
                continue;
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

        const len = trainingData.length - skips;
    
        return {
            xs: xs.map((x, i) => tf.tensor(x as any).reshape(
                i % 2 === 0
                    ? [len, ...spatialShape]
                    : [len, ...extraShape]
            )),
            ys: tf.tensor(ys).reshape([len, evalNodeCount]),
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
