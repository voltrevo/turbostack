import { generateScoreTrainingData } from "../src/generateScoreTrainingData";
import { PredictionModel } from "../src/PredictionModel";
import { ScoreModel } from "../src/ScoreModel";
import { WelfordCalculator } from "../src/WelfordCalculator";

async function generateAndSaveTrainingData() {
    console.log('loading model');
    let predictionModel = await PredictionModel.load();

    const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    let trainingData = ScoreModel.dataSet([
        yyyymmdd,
        Math.random().toString(36).slice(2, 6),
    ]);

    // Create a board evaluator using the blank model
    let boardEvaluator = predictionModel.createBoardEvaluator();

    console.log('generating training data');
    // Generate training data using the board evaluator

    const calc = new WelfordCalculator();

    const limit = 2_000;
    let t = Date.now();

    while (trainingData.size() < limit) {
        const newData = generateScoreTrainingData(boardEvaluator, 100);

        const uniqScores = new Set(newData.map(d => d.finalScore));

        for (const score of uniqScores) {
            calc.update(score);
        }

        trainingData.add(newData);

        console.log();
        console.log(calc.fmt());

        console.log([
            trainingData.size().toLocaleString(),
            limit.toLocaleString(),
        ].join(' / '));

        await trainingData.save();

        const dt = Date.now() - t;
        t += dt;
        const samplesPerSecond = newData.length / (dt / 1000);

        console.log(
            'samples per second:',
            samplesPerSecond.toFixed(1),
        );
    }
}

generateAndSaveTrainingData().catch(console.error);
