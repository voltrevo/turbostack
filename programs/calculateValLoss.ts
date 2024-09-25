import { PredictionModel } from "../src/PredictionModel";

async function calculateValLoss() {
    console.log('loading model');
    let model = await PredictionModel.load();
    let trainingData = await PredictionModel.loadDataSet();
    console.log('valLoss:', model.calculateValLoss(trainingData));
}

calculateValLoss().catch(console.error);
