import { generateTrainingData, TrainingDataPair } from "../src/generateTrainingData";
import { createBoardEvaluator } from "../src/model";
import { showPerformanceSummary } from "../src/showPerformanceSummary";
import { trainModel } from "../src/train";
import { loadModel, saveModel } from "./helpers/modelStorage";

async function feedbackTraining() {
    console.log('loading model');
    let model = await loadModel();

    let trainingData: TrainingDataPair[] = [];

    while (true) {
        // Create a board evaluator using the blank model
        let boardEvaluator = createBoardEvaluator(model);

        console.log('generating training data');
        // Generate training data using the board evaluator
        trainingData = trainingData.slice(-4000);

        while (trainingData.length < 5000) {
            trainingData.push(...generateTrainingData(boardEvaluator, 1000));
        }

        // Train the model on the training data
        model = await trainModel(model, trainingData, 50);

        // Use the updated model to replace the training data
        boardEvaluator = createBoardEvaluator(model);

        showPerformanceSummary(boardEvaluator, trainingData);

        await saveModel(model);
    }
}

feedbackTraining().catch(console.error);
