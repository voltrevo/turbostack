import { generateTrainingData } from "../src/generateTrainingData";
import { createBoardEvaluator } from "../src/model";
import { TrainingDataSet } from "../src/TrainingDataSet";
import { loadModel } from "./helpers/modelStorage";

async function generateAndSaveTrainingData() {
    console.log('loading model');
    let model = await loadModel();

    let trainingData = new TrainingDataSet();

    // Create a board evaluator using the blank model
    let boardEvaluator = createBoardEvaluator(model);

    console.log('generating training data');
    // Generate training data using the board evaluator

    while (trainingData.size() < 5_000) {
        trainingData.add(generateTrainingData(boardEvaluator, 100));
        console.log(`${trainingData.size()} / 5000`);
    }

    await trainingData.save();
}

generateAndSaveTrainingData().catch(console.error);
