import { generateScoreTrainingData } from "../src/generateScoreTrainingData";
import { ScoreModel } from "../src/ScoreModel";
import { showPerformanceSummary } from "../src/showPerformanceSummary";

async function feedbackTraining() {
    const startTime = Date.now();

    console.log('loading model');
    let model = await ScoreModel.load();

    let trainingData = await ScoreModel.loadDataSet();
    trainingData.setMaxSize(5000);

    while (true) {
        // Create a board evaluator using the blank model
        let boardEvaluator = model.createBoardEvaluator();

        console.log('generating training data');

        for (let i = 0; i < 10; i++) {
            trainingData.add(generateScoreTrainingData(boardEvaluator, 100));
            console.log((i + 1) * 100, 'new samples');
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
