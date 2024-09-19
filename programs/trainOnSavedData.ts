import { createBoardEvaluator } from "../src/model";
import { showPerformanceSummary } from "../src/showPerformanceSummary";
import { trainModel } from "../src/train";
import { loadModel, loadTrainingData, saveModel } from "./helpers/modelStorage";

async function trainOnSavedData() {
    console.log('loading model');
    let model = await loadModel();

    console.log('loading training data');
    const trainingData = await loadTrainingData();

    if (trainingData === undefined) {
        throw new Error('Training data not found');
    }

    // Create a board evaluator using the blank model
    let boardEvaluator = createBoardEvaluator(model);

    // Train the model on the training data
    model = await trainModel(model, trainingData, 500);

    // Use the updated model to replace the training data
    boardEvaluator = createBoardEvaluator(model);

    showPerformanceSummary(boardEvaluator);

    await saveModel(model);
}

trainOnSavedData().catch(console.error);
