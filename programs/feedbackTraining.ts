import { generateTrainingData } from "../src/generateTrainingData";
import { createBoardEvaluator } from "../src/model";
import { showPerformanceSummary } from "../src/showPerformanceSummary";
import { trainModel } from "../src/train";
import { TrainingDataSet } from "../src/TrainingDataSet";
import { loadModel, saveModel } from "../src/modelStorage";

async function feedbackTraining() {
    const startTime = Date.now();

    console.log('loading model');
    let model = await loadModel();

    let trainingData = await TrainingDataSet.load();

    while (true) {
        // Create a board evaluator using the blank model
        let boardEvaluator = createBoardEvaluator(model);

        console.log('generating training data');
        // Generate training data using the board evaluator
        trainingData.keepRecent(4000);

        while (trainingData.size() < 5000) {
            trainingData.add(generateTrainingData(boardEvaluator, 100));
            console.log('trainingData.size()', trainingData.size());
        }

        await trainingData.save();

        // Train the model on the training data
        model = await trainModel(model, trainingData, 200);

        // Use the updated model to replace the training data
        boardEvaluator = createBoardEvaluator(model);

        await showPerformanceSummary(Date.now() - startTime, boardEvaluator);

        await saveModel(model);
    }
}

feedbackTraining().catch(console.error);
