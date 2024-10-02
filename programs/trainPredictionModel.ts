import { PredictionModel } from "../src/PredictionModel";
import { showPerformanceSummary } from "../src/showPerformanceSummary";

async function trainPredictionModel() {
    const startTime = Date.now();

    console.log('loading model');
    let model = await PredictionModel.load();

    console.log('loading training data');
    let trainingData = await PredictionModel.loadDataSet();

    if (trainingData.size() === 0) {
        throw new Error('Training data not found');
    }

    let bestLoss = model.calculateLoss(trainingData);
    let bestValLoss = model.calculateValLoss(trainingData);

    console.log('loss:', bestLoss);
    console.log('valLoss:', bestValLoss);

    while (true) {
        try {
            // Train the model on the training data
            await model.train(trainingData, 10);
        } catch (e) {
            console.error(e);
            continue;
        }

        const newValLoss = model.calculateValLoss(trainingData);

        await showPerformanceSummary(
            Date.now() - startTime,
            newValLoss,
        );

        const newLoss = model.calculateLoss(trainingData);

        if (newLoss < bestLoss) {
            bestLoss = newLoss;
            model.setLearningRate(model.learningRate * Math.exp(0.05));
        } else {
            model.setLearningRate(model.learningRate * Math.exp(-0.5));
        }

        console.log('new learning rate:', model.learningRate);

        if (newValLoss < bestValLoss) {
            bestValLoss = newValLoss;
            await model.save();
            console.log('saved updated model');
        }
    }
}

trainPredictionModel().catch(console.error);
