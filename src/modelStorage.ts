import fs from 'fs/promises';
import fsClassic from 'fs';

import * as tf from '@tensorflow/tfjs-node';

import { TrainingDataPair } from './generateTrainingData';
import { Board, BoardJson } from './Board';
import { TrainingDataSet } from './TrainingDataSet';
import { exists } from './exists';

fsClassic.mkdirSync('data', { recursive: true });

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
