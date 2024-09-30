import { Board } from './Board';
import { BoardEvaluator } from './BoardEvaluator';

export const randomBoardEvaluator: BoardEvaluator = async (boards: Board[]): Promise<number[]> => {
    return boards.map(_b => Math.random());
}
