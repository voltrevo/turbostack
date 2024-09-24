import { createBoardEvaluator } from "../src/model";
import { showPerformanceSummary } from "../src/showPerformanceSummary";
import { trainModel } from "../src/train";
import { TrainingDataSet } from "../src/TrainingDataSet";
import { loadModel, saveModel } from "../src/modelStorage";

async function trainOnSavedData() {
    const startTime = Date.now();

    console.log('loading model');
    let model = await loadModel();

    console.log('loading training data');
    const trainingData = await TrainingDataSet.load();

    if (trainingData === undefined) {
        throw new Error('Training data not found');
    }

    // Create a board evaluator using the blank model
    let boardEvaluator = createBoardEvaluator(model);

    while (true) {
        const sampleTrainingData = trainingData.sample(10_000);

        // Train the model on the training data
        model = await trainModel(model, sampleTrainingData, 10);

        // Use the updated model to replace the training data
        boardEvaluator = createBoardEvaluator(model);

        await showPerformanceSummary(Date.now() - startTime, boardEvaluator);

        await saveModel(model);
    }
}

trainOnSavedData().catch(console.error);
