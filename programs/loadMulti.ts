import { ScoreModel } from "../src/ScoreModel";
import { WelfordCalculator } from "../src/WelfordCalculator";

async function loadMulti() {
    const trainingData = ScoreModel.dataSet();
    await trainingData.loadMulti();

    console.log(trainingData.size());

    let calc = new WelfordCalculator();
    let prevScore = -Infinity;

    for (const x of trainingData.data) {
        if (x.finalScore !== prevScore) {
            calc.update(x.finalScore);
        }
        
        prevScore = x.finalScore;
    }

    for (const x of trainingData.valData) {
        if (x.finalScore !== prevScore) {
            calc.update(x.finalScore);
        }
        
        prevScore = x.finalScore;
    }

    console.log(calc.fmt());
}

loadMulti().catch(console.error);
