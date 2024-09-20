import * as tf from '@tensorflow/tfjs-node';

import { createModel, Model } from './model';
import { TrainingDataSet } from './TrainingDataSet';

// Training function
export async function trainModel(
    existingModel: Model | undefined,
    trainingData: TrainingDataSet,
    epochs: number,
) {
    const model = existingModel ?? createModel();

    const { data, valData } = trainingData.prepare();

    await model.fit(data.xs, data.ys, {
        epochs,
        batchSize: 32,
        validationData: [valData.xs, valData.ys],
        callbacks: [
            tf.callbacks.earlyStopping({
                monitor: 'val_loss',
                patience: 20,
            }),
        ],
    });

    console.log("Training complete.");

    return model;
};
