import { generateScoreTrainingData } from "../src/generateScoreTrainingData";
import { ScoreModel } from "../src/ScoreModel";

async function generateAndSaveTrainingData() {
    console.log('loading model');
    let model = await ScoreModel.load();

    let trainingData = ScoreModel.dataSet();

    // Create a board evaluator using the blank model
    let boardEvaluator = model.createBoardEvaluator();

    console.log('generating training data');
    // Generate training data using the board evaluator

    while (trainingData.size() < 5_000) {
        trainingData.add(generateScoreTrainingData(boardEvaluator, 100));
        console.log(`${trainingData.size()} / 5000`);
    }

    await trainingData.save();
}

generateAndSaveTrainingData().catch(console.error);
