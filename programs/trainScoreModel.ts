import { validationSplit } from "../src/hyperParams";
import { ScoreModel } from "../src/ScoreModel";
import { showPerformanceSummary } from "../src/showPerformanceSummary";

async function trainScoreModel() {
    const startTime = Date.now();

    console.log('loading model');
    let model = await ScoreModel.load();

    console.log('loading training data');
    const trainingData = await ScoreModel.loadDataSet();

    if (trainingData.size() === 0) {
        throw new Error('Training data not found');
    }

    const splitData = trainingData.all(validationSplit);
    const { data, valData } = {
        data: ScoreModel.prepareTrainingData(splitData.data),
        valData: ScoreModel.prepareTrainingData(splitData.valData),
    };

    console.log(`Loaded ${trainingData.size()} training data points`);

    await showPerformanceSummary(
        Date.now() - startTime,
        model.calculateValLossImpl(valData),
        // boardEvaluator,
        // boards => model.predictMean(boards),
    );

    // Train the model on the training data
    await model.trainImpl(data, valData, 50);

    await model.save();
}

trainScoreModel().catch(console.error);
