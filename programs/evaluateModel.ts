import { Board } from "../src/Board";
import { generateGameBoards } from "../src/generateGameBoards";
import { WelfordCalculator } from "../src/WelfordCalculator";
import { stdMaxLines } from "../src/hyperParams";
import { ScoreModel } from "../src/ScoreModel";

async function evaluateModel() {
    console.log('loading model');
    let model = await ScoreModel.load();

    const calc = new WelfordCalculator();

    let boardEvaluator = model.createBoardEvaluator();

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
