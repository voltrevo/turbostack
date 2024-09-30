import { Board } from "./Board";
import { ALL_PIECE_TYPES } from "./PieceType";

export type CoreBoardEvaluator = (boards: Board[]) => number[];
export type BoardEvaluator = (boards: Board[]) => Promise<number[]>;

export let batchEvaluationTime = 0;

export function deeperBoardEvaluator(boardEvaluator: BoardEvaluator): BoardEvaluator {
    return async boards => {
        // for each board, figure out what to do on the next move for each of the 7 pieces, then
        // average the evals for each one

        const evals = [];

        for (const board of boards) {
            let sum = 0;

            for (const pieceType of ALL_PIECE_TYPES) {
                const choices = board.findChoices(pieceType);
                const choiceEvals = await boardEvaluator(choices);
                const highestEval = Math.max(...choiceEvals)
                sum += highestEval;
            }

            evals.push(sum / ALL_PIECE_TYPES.length);
        }

        return evals;
    };
}

export function createBatchBoardEvaluator(
    coreBoardEvaluator: CoreBoardEvaluator,
    batchSizeThreshold: number,
    maxWaitTimeMs: number,
): BoardEvaluator {
    const requestQueue: {
        resolve: (value: number[]) => void;
        reject: (reason: any) => void;
        boards: Board[];
    }[] = [];
    let queueSize = 0;
    let timer: NodeJS.Timeout | null = null;

    async function processQueue() {
        if (queueSize === 0) return;

        // Clear the timer if it's set
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }

        // Copy and reset the queue
        const queuedRequests = requestQueue.splice(0, requestQueue.length);
        queueSize = 0;

        // Combine all boards into one array
        const allBoards: Board[] = [];
        for (const req of queuedRequests) {
            allBoards.push(...req.boards);
        }

        try {
            // Evaluate all boards using the core evaluator
            // console.log('processing batch size', allBoards.length);
            const startTime = performance.now();
            const allResults = coreBoardEvaluator(allBoards);
            const endTime = performance.now();
            batchEvaluationTime += endTime - startTime;

            // console.log('s/eval', ((endTime - startTime) / 1000) / allBoards.length);

            // Distribute results back to the individual promises
            let resultIndex = 0;
            for (const req of queuedRequests) {
                const { boards, resolve } = req;
                const resultSlice = allResults.slice(
                    resultIndex,
                    resultIndex + boards.length
                );
                resolve(resultSlice);
                resultIndex += boards.length;
            }
        } catch (error) {
            // If there's an error, reject all promises
            for (const req of queuedRequests) {
                req.reject(error);
            }
        }
    }

    function evalBatch(boards: Board[]): Promise<number[]> {
        return new Promise((resolve, reject) => {
            requestQueue.push({ resolve, reject, boards });
            queueSize += boards.length;

            if (queueSize >= batchSizeThreshold) {
                processQueue();
            } else if (!timer) {
                timer = setTimeout(processQueue, maxWaitTimeMs);
            }
        });
    }

    return evalBatch;
}
