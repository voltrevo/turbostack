import { generateTrainingData, TrainingDataPair } from "../src/generateTrainingData";
import { createBoardEvaluator } from "../src/model";
import { loadModel, saveTrainingData } from "./helpers/modelStorage";

async function generateAndSaveTrainingData() {
    console.log('loading model');
    let model = await loadModel();

    let trainingData: TrainingDataPair[] = [];

    // Create a board evaluator using the blank model
    let boardEvaluator = createBoardEvaluator(model);

    console.log('generating training data');
    // Generate training data using the board evaluator

    while (trainingData.length < 5_000) {
        trainingData.push(...generateTrainingData(boardEvaluator, 100));
        console.log(`${trainingData.length} / 5000`);
    }

    await saveTrainingData(trainingData);
}

generateAndSaveTrainingData().catch(console.error);
