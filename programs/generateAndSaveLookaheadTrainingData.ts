import { generateLookaheadTrainingData, TrainingDataPair } from "../src/generateTrainingData";
import { createBoardEvaluator } from "../src/model";
import { loadModel, loadTrainingData, saveTrainingData } from "./helpers/modelStorage";

async function generateAndSaveLookaheadTrainingData() {
    console.log('loading model');
    let model = await loadModel();

    let trainingData: TrainingDataPair[] = [];
    const saved = await loadTrainingData();

    if (process.argv[2] === 'more') {
        const saved = await loadTrainingData();

        if (saved === undefined) {
            throw new Error('oops');
        }

        trainingData = saved;
        console.log(`adding to ${saved.length} existing rows`)
    } else if (saved !== undefined) {
        console.log(`warning: will overwrite ${saved.length} rows of training data`);
        console.log('(waiting 5s)');
        await new Promise(resolve => setTimeout(resolve, 5_000));
    }

    // Create a board evaluator using the blank model
    let boardEvaluator = createBoardEvaluator(model);

    while (trainingData.length < 1_000_000) {
        console.log('generating');
        trainingData.push(...generateLookaheadTrainingData(boardEvaluator, 1000, 10));
        console.log('saving');
        await saveTrainingData(trainingData);
        console.log(`${trainingData.length} saved (max 1m)`);
    }
}

generateAndSaveLookaheadTrainingData().catch(console.error);
