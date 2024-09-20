import { generateTrainingData, TrainingDataPair } from "../src/generateTrainingData";
import { createBoardEvaluator } from "../src/model";
import { showPerformanceSummary } from "../src/showPerformanceSummary";
import { trainModel } from "../src/train";
import { loadModel, loadTrainingData, saveModel, saveTrainingData } from "./helpers/modelStorage";

async function feedbackTraining() {
    const startTime = Date.now();

    console.log('loading model');
    let model = await loadModel();

    let trainingData: TrainingDataPair[] = (await loadTrainingData()) ?? [];

    while (true) {
        // Create a board evaluator using the blank model
        let boardEvaluator = createBoardEvaluator(model);

        console.log('generating training data');
        // Generate training data using the board evaluator
        trainingData = trainingData.slice(-1200);

        while (trainingData.length < 1500) {
            trainingData.push(...generateTrainingData(boardEvaluator, 100));
            console.log('trainingData.length', trainingData.length);
        }

        await saveTrainingData(trainingData);

        // Train the model on the training data
        model = await trainModel(model, trainingData, 50);

        // Use the updated model to replace the training data
        boardEvaluator = createBoardEvaluator(model);

        showPerformanceSummary(boardEvaluator);
        console.log(`Training for ${((Date.now() - startTime) / 60_000).toFixed(1)} minutes`);

        await saveModel(model);
    }
}

feedbackTraining().catch(console.error);
