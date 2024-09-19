import { Board } from "../src/Board";
import { generateGameBoards } from "../src/generateGameBoards";
import { createBoardEvaluator } from "../src/model";
import { WelfordCalculator } from "../src/WelfordCalculator";
import { loadModel } from "./helpers/modelStorage";
import { stdMaxLines } from "./helpers/hyperParams";

async function evaluateModel() {
    console.log('loading model');
    let model = await loadModel();

    const calc = new WelfordCalculator();

    // Create a board evaluator using the blank model
    let boardEvaluator = createBoardEvaluator(model);

    while (true) {
        for (let i = 0; i < 100; i++) {
            const { finalScore } = generateGameBoards(new Board(stdMaxLines), boardEvaluator);
            calc.update(finalScore);
        }

        const mean = calc.getMean();
        const stdev = calc.getStdev();
        const metaStdev = stdev / Math.sqrt(calc.n);

        // This is a little crude because it assumes stdev is the true value, but it seems to work
        // more than well enough for our purposes
        const rel2StdevError = 2 * metaStdev / mean;

        console.log(`${Math.round(mean)} ± ${(100 * rel2StdevError).toFixed(1)}% (n=${calc.n})`);
    }
}

evaluateModel().catch(console.error);
