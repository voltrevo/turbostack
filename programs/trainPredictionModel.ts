import { PredictionModel } from "../src/PredictionModel";
import { showPerformanceSummary } from "../src/showPerformanceSummary";

async function trainPredictionModel() {
    const startTime = Date.now();

    console.log('loading model');
    let model = await PredictionModel.load();

    console.log('loading training data');
    let trainingData = await PredictionModel.loadDataSet();

    while (true) {
        const currTrainingData = trainingData.sample(2000);

        if (currTrainingData.size() === 0) {
            throw new Error('Training data not found');
        }

        try {
            // Train the model on the training data
            await model.train(currTrainingData, 100);
        } catch (e) {
            console.error(e);
            continue;
        }

        await showPerformanceSummary(
            Date.now() - startTime,
            model.createBoardEvaluator(),
        );

        await model.save();
    }
}

trainPredictionModel().catch(console.error);
