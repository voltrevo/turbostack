import { Board } from "../src/Board";
import { generateGameBoards } from "../src/generateGameBoards";
import { WelfordCalculator } from "../src/WelfordCalculator";
import { stdMaxLines } from "../src/hyperParams";
import { PredictionModel } from "../src/PredictionModel";

async function evaluateModel() {
    console.log('loading model');
    let model = await PredictionModel.load();

    const calc = new WelfordCalculator();

    let boardEvaluator = model.createBoardEvaluator();

    while (true) {
        for (let i = 0; i < 10; i++) {
            const { finalScore } = generateGameBoards(new Board(stdMaxLines), boardEvaluator);
            calc.update(finalScore);
        }

        console.log(calc.fmt());
    }
}

evaluateModel().catch(console.error);
