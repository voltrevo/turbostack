import { generateScoreTrainingData } from "../src/generateScoreTrainingData";
import { ScoreModel } from "../src/ScoreModel";
import { showPerformanceSummary } from "../src/showPerformanceSummary";

async function feedbackTraining() {
    const startTime = Date.now();

    console.log('loading model');
    let model = await ScoreModel.load();

    let trainingData = await ScoreModel.loadDataSet();

    while (true) {
        // Create a board evaluator using the blank model
        let boardEvaluator = model.createBoardEvaluator();

        console.log('generating training data');
        // Generate training data using the board evaluator
        trainingData.keepRecent(4000);

        while (trainingData.size() < 5000) {
            trainingData.add(generateScoreTrainingData(boardEvaluator, 100));
            console.log('trainingData.size()', trainingData.size());
        }

        await trainingData.save();

        // Train the model on the training data
        await model.train(trainingData, 200);

        // Use the updated model to replace the training data
        boardEvaluator = model.createBoardEvaluator();

        await showPerformanceSummary(
            Date.now() - startTime,
            model.calculateValLoss(trainingData),
            boardEvaluator,
        );

        await model.save();
    }
}

feedbackTraining().catch(console.error);
