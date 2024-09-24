import { Board } from './Board';
import { BoardEvaluator } from './generateTrainingData';

export const randomBoardEvaluator: BoardEvaluator = (boards: Board[]): number[] => {
    return boards.map(_b => Math.random());
}
