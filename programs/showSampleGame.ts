import { Board } from "../src/Board";
import { generateGameBoards } from "../src/generateGameBoards";
import { createBoardEvaluator } from "../src/model";
import { stdMaxLines } from "./helpers/hyperParams";
import { loadModel } from "./helpers/modelStorage";

async function showSampleGame() {
    const model = await loadModel();

    const { positions: boards } = generateGameBoards(new Board(stdMaxLines), createBoardEvaluator(model));

    for (let i = 1; i < boards.length; i++) {
        console.log(i, boards[i].toStringDiff(boards[i - 1]));
    }
}

showSampleGame().catch(console.error);
