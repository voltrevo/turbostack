import { Board } from "../src/Board";
import { stdMaxLines } from "../src/hyperParams";
import { MiniScoreModel } from "../src/MiniScoreModel";
import { ScoreModel } from "../src/ScoreModel";

async function predict() {
    let boardA = new Board(20);
    boardA.score = 1000;

    let boardB = new Board(20);
    boardB.score = 4000;

    const model = await ScoreModel.load();
    const [a, b] = model.predictMean([boardA, boardB]);

    console.log(b.mean - a.mean);
}

predict().catch(console.error);
