import { Board } from "../src/Board";
import { generateGameBoards } from "../src/generateGameBoards";
import { createBoardEvaluator } from "../src/model";
import { boardGenBacktrackLen, stdMaxLines } from "./helpers/hyperParams";
import { loadModel } from "./helpers/modelStorage";

async function showSampleGame() {
    const model = await loadModel();

    const { positions: startBoards } = generateGameBoards(new Board(stdMaxLines), createBoardEvaluator(model));

    const backtrackLen = (
        boardGenBacktrackLen.min +
        Math.floor(Math.random() * (
            boardGenBacktrackLen.max - boardGenBacktrackLen.min
        ))
    );

    const startBoardsIndex = Math.max(0, startBoards.length - backtrackLen);
    const startBoard = startBoards[startBoardsIndex];

    const { positions: boards } = generateGameBoards(startBoard, createBoardEvaluator(model));

    for (let i = 1; i < boards.length; i++) {
        console.log(i, boards[i].toStringDiff(boards[i - 1]));
    }
}

showSampleGame().catch(console.error);
