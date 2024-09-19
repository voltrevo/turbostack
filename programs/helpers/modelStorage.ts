import fs from 'fs/promises';
import path from 'path';

import * as tf from '@tensorflow/tfjs-node';

import { createModel, Model } from "../../src/model";
import { TrainingDataPair } from '../../src/generateTrainingData';
import { Board, BoardJson } from '../../src/Board';

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

export async function saveTrainingData(trainingData: TrainingDataPair[]) {
    await fs.writeFile('data/savedTrainingData.json', JSON.stringify(trainingData.map(
        ({ board, finalScore }) => ({
            board: board.toJson(),
            finalScore,
        }),
    )));
}

export async function loadTrainingData(): Promise<TrainingDataPair[] | undefined> {
    let raw;

    try {
        raw = await fs.readFile('data/savedTrainingData.json', 'utf8');
    } catch {
        return undefined;
    }

    const jsonBoards: { board: BoardJson, finalScore: number }[] = JSON.parse(raw);

    return jsonBoards.map(jb => ({
        board: Board.fromJson(jb.board),
        finalScore: jb.finalScore,
    }));
}
