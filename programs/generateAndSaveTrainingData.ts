import { generateTrainingData } from "../src/generateTrainingData";
import { ScoreModel } from "../src/ScoreModel";
import { TrainingDataSet } from "../src/TrainingDataSet";

async function generateAndSaveTrainingData() {
    console.log('loading model');
    let model = await ScoreModel.load();

    let trainingData = new TrainingDataSet();

    // Create a board evaluator using the blank model
    let boardEvaluator = model.createBoardEvaluator();

    console.log('generating training data');
    // Generate training data using the board evaluator

    while (trainingData.size() < 5_000) {
        trainingData.add(generateTrainingData(boardEvaluator, 100));
        console.log(`${trainingData.size()} / 5000`);
    }

    await trainingData.save();
}

generateAndSaveTrainingData().catch(console.error);
