import { ScoreModel } from "../src/ScoreModel";
import { showPerformanceSummary } from "../src/showPerformanceSummary";

async function trainOnSavedData() {
    const startTime = Date.now();

    console.log('loading model');
    let model = await ScoreModel.load();

    console.log('loading training data');
    const trainingData = ScoreModel.dataSet();
    await trainingData.loadMulti();

    if (trainingData.size() === 0) {
        throw new Error('Training data not found');
    }

    // Create a board evaluator using the blank model
    let boardEvaluator = model.createBoardEvaluator();

    while (true) {
        const sampleTrainingData = trainingData.sample(10_000);

        // Train the model on the training data
        await model.train(sampleTrainingData, 10);

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

trainOnSavedData().catch(console.error);
