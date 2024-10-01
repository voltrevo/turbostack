import fs from 'fs/promises';

import { generateScoreTrainingData } from "../src/generateScoreTrainingData";
import { PredictionModel } from "../src/PredictionModel";
import { WelfordCalculator } from "../src/WelfordCalculator";
import { ScoreModel } from '../src/ScoreModel';

async function generateAndSaveTrainingData() {
    console.log('loading models');
    const scoreModel = await ScoreModel.load();

    const yyyymmddhh = () => new Date().toISOString().slice(0, 13).replace(/[-:T]/g, '');

    const scoreBoardEvaluator = scoreModel.createBoardEvaluator();

    console.log('generating training data');
    // Generate training data using the board evaluator

    const limit = 50;
    let t = Date.now();

    let size = 0;

    while (size < limit) {
        const newData = await generateScoreTrainingData(scoreBoardEvaluator);

        size += newData.length;

        for (const x of newData) {
            const calc = new WelfordCalculator();
            for (const score of x.finalScoreSamples ?? []) {
                calc.update(score);
            }

            if (x.prevBoard) {
                console.log(x.board.toStringDiff(x.prevBoard));
            } else {
                console.log(x.board.toString());
            }

            console.log(calc.fmt());
        }

        const lineJson = newData.map(({ board, finalScore, finalScoreSamples, scoreStdev }) => JSON.stringify({
            board: board.toJson(),
            finalScore,
            finalScoreSamples,
            scoreStdev,
        })).join('\n');

        await fs.appendFile(`./data/dataset/scoreTrainingData-${yyyymmddhh()}.jsonl`, lineJson + '\n');

        console.log([
            size.toLocaleString(),
            limit.toLocaleString(),
        ].join(' / '));

        const dt = Date.now() - t;
        t += dt;
        const generationTime = (dt / 1000) / newData.length;

        console.log(`generation time: ${generationTime.toFixed(1)}s`);
    }
}

generateAndSaveTrainingData().catch(console.error);
