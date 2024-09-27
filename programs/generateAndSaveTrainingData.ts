import fs from 'fs/promises';

import { generateScoreTrainingData } from "../src/generateScoreTrainingData";
import { PredictionModel } from "../src/PredictionModel";
import { WelfordCalculator } from "../src/WelfordCalculator";

async function generateAndSaveTrainingData() {
    console.log('loading model');
    let predictionModel = await PredictionModel.load();

    const yyyymmddhh = () => new Date().toISOString().slice(0, 13).replace(/[-:T]/g, '');

    // Create a board evaluator using the blank model
    let boardEvaluator = predictionModel.createBoardEvaluator();

    console.log('generating training data');
    // Generate training data using the board evaluator

    const calc = new WelfordCalculator();

    const limit = 10;
    let t = Date.now();

    let size = 0;

    while (size < limit) {
        const newData = generateScoreTrainingData(boardEvaluator, 1);
        size += newData.length;

        const lineJson = newData.map(({ board, finalScore, finalScoreSamples }) => JSON.stringify({
            board: board.toJson(),
            finalScore,
            finalScoreSamples,
        })).join('\n');

        await fs.appendFile(`./data/dataset/scoreTrainingData-${yyyymmddhh()}.jsonl`, lineJson + '\n');

        const uniqScores = new Set(newData.map(d => d.finalScore));

        for (const score of uniqScores) {
            calc.update(score);
        }

        console.log();
        console.log(calc.fmt());

        console.log([
            size.toLocaleString(),
            limit.toLocaleString(),
        ].join(' / '));

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
