import fs from 'fs/promises';
import path from 'path';

import * as tf from '@tensorflow/tfjs-node';

import { createModel, Model } from "./model";
import { TrainingDataPair } from './generateTrainingData';
import { Board, BoardJson } from './Board';
import { TrainingDataSet } from './TrainingDataSet';

const location = path.resolve(process.cwd(), 'data/model');

export async function loadModel(): Promise<Model> {
    if (!(await exists(location))) {
        return createModel();
    }

    const model = await tf.loadLayersModel('file://' + location + '/model.json');

    model.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError'
    });

    return model;
}

export async function saveModel(model: Model) {
    await fs.mkdir(location, { recursive: true });
    await model.save('file://' + location);
}

async function exists(path: string) {
    try {
        await fs.stat(path);
        return true;
    } catch {
        return false;
    }
}

export async function saveTrainingData(trainingDataSet: TrainingDataSet) {
    const toSaveFmt = (data: TrainingDataPair[]) => data.map(
        ({ board, finalScore }) => ({
            board: board.toJson(),
            finalScore,
        }),
    );

    await fs.writeFile('data/savedTrainingData.json', JSON.stringify({
        data: toSaveFmt(trainingDataSet.data),
        valData: toSaveFmt(trainingDataSet.valData),
    }));
}

export async function loadTrainingData(): Promise<{
    data: TrainingDataPair[],
    valData: TrainingDataPair[],
} | undefined> {
    let raw;

    try {
        raw = await fs.readFile('data/savedTrainingData.json', 'utf8');
    } catch {
        return undefined;
    }

    type SaveFmt = { board: BoardJson, finalScore: number }[];

    const jsonBoards: {
        data: { board: BoardJson, finalScore: number }[],
        valData: { board: BoardJson, finalScore: number }[]
    } = JSON.parse(raw);

    const fromSaveFmt = (s: SaveFmt): TrainingDataPair[] => s.map(({ board, finalScore }) => ({
        board: Board.fromJson(board),
        finalScore: finalScore,
    }));

    return {
        data: fromSaveFmt(jsonBoards.data),
        valData: fromSaveFmt(jsonBoards.valData),
    };
}

export async function addPerfLog(duration: number | string, low: number, high: number) {
    if (!await exists('data/perfLog.csv')) {
        await fs.writeFile('data/perfLog.csv', 'duration,low,high\n');
    }

    await fs.appendFile('data/perfLog.csv', `${duration},${low},${high}\n`);
}
