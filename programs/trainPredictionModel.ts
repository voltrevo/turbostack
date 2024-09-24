import { PredictionModel } from "../src/PredictionModel";
import { showPerformanceSummary } from "../src/showPerformanceSummary";

async function trainOnSavedData() {
    const startTime = Date.now();

    console.log('loading model');
    let model = await PredictionModel.load();

    console.log('loading training data');
    let trainingData = await PredictionModel.loadDataSet();
    trainingData = trainingData.sample(1000);

    if (trainingData.size() === 0) {
        throw new Error('Training data not found');
    }

    // Create a board evaluator using the blank model
    let boardEvaluator = model.createBoardEvaluator();

    // Train the model on the training data
    await model.train(trainingData, 200);

    // Use the updated model to replace the training data
    boardEvaluator = model.createBoardEvaluator();

    await showPerformanceSummary(Date.now() - startTime, boardEvaluator);

    await model.save();
}

trainOnSavedData().catch(console.error);
