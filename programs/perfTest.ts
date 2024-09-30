import { Board } from "../src/Board";
import { generateGameBoards } from "../src/generateGameBoards";
import { stdMaxLines } from "../src/hyperParams";
import { PredictionModel } from "../src/PredictionModel";
import { ScoreModel } from "../src/ScoreModel";

async function perfTest() {
    const gameLen = 50;

    const model = await ScoreModel.load();
    const startTime = Date.now();
    const boardEvaluator = model.createBoardEvaluator();

    const results = await Promise.all(
        Array.from({ length: gameLen }, async () => {
            const { finalScore } = await generateGameBoards(new Board(stdMaxLines), boardEvaluator);
            return finalScore;
        }),
    );
    
    console.log(Math.min(...results), Math.max(...results));

    const endTime = Date.now();
    console.log(`Duration ${endTime - startTime}ms`);
    console.log('duration per game', (endTime - startTime) / gameLen);
}

perfTest().catch(console.error);
