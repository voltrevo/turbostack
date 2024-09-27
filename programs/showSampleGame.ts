import { Board } from "../src/Board";
import { generateGameBoards } from "../src/generateGameBoards";
import { stdMaxLines } from "../src/hyperParams";
import { ScoreModel } from "../src/ScoreModel";

async function showSampleGame() {
    const model = await ScoreModel.load();

    const { positions } = generateGameBoards(
        new Board(stdMaxLines),
        model.createBoardEvaluator(),
    );

    for (let i = 1; i < positions.length; i++) {
        console.log(i, positions[i].toStringDiff(positions[i - 1]));
    }
}

showSampleGame().catch(console.error);
