import { ScoreModel } from "../src/ScoreModel";

async function loadMulti() {
    const trainingData = ScoreModel.dataSet();
    await trainingData.loadMulti();

    console.log(trainingData.size());
}

loadMulti().catch(console.error);
