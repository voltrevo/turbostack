import fs from 'fs/promises';
import path from 'path';

import * as tf from '@tensorflow/tfjs-node';

import { createModel, Model } from "../../src/model";

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
