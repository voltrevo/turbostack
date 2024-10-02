import { Board } from "../src/Board";
import { generateGameBoards } from "../src/generateGameBoards";
import { WelfordCalculator } from "../src/WelfordCalculator";
import { stdMaxLines } from "../src/hyperParams";
import { PredictionModel } from "../src/PredictionModel";
import { ScoreModel } from "../src/ScoreModel";

async function evaluateModel() {
    console.log('loading model');
    let model = await ScoreModel.load();
    const yyyymmddhhmmss = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    await model.save(`snaps/scoreModel-${yyyymmddhhmmss}`);
    console.log('snapshot saved at scoreModel-' + yyyymmddhhmmss);

    const calc = new WelfordCalculator();

    let boardEvaluator = model.createBoardEvaluator();

    while (true) {
        await Promise.all(
            Array.from({ length: 10 }, async () => {
                const { finalScore } = await generateGameBoards(
                    new Board(stdMaxLines),
                    boardEvaluator,
                );

                calc.update(finalScore);
            })
        );

        console.log(calc.fmt());
    }
}

evaluateModel().catch(console.error);
