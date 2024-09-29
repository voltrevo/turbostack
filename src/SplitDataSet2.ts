import fs from 'fs/promises';
import { createReadStream } from 'fs';
import rl from 'readline';

const goldenish = 89 / 144;
const batchSize = 144;

function randish(i: number) {
    return ((i % batchSize) * goldenish) % 1;
}

export class SplitDataSet2<T> {
    private allData: T[] = [];

    constructor(
        private name: string | undefined,
        private maxSize: number,
        private toSaveFmt: (x: T) => unknown,
        private fromSaveFmt: (parsed: unknown) => T,
    ) {
        if (maxSize < batchSize) {
            throw new Error(`maxSize must be at least ${batchSize}`);
        }
    }

    add(newData: T[]) {
        this.allData.push(...newData);
        this.trim();
    }

    private trim() {
        const excess = this.allData.length - this.maxSize;

        if (excess > 0) {
            const batchesToRemove = Math.ceil(excess / batchSize);
            this.allData = this.allData.slice(batchesToRemove * batchSize);
        }
    }

    size() {
        return this.allData.length;
    }

    all(valSplit: number) {
        return this.sample(valSplit, this.size());
    }

    sample(valSplit: number, size: number) {
        let data: T[] = [];
        let valData: T[] = [];

        size = Math.min(size, this.size());

        for (let i = 0; i < this.allData.length; i++) {
            const target = randish(i) < valSplit ? valData : data;
            target.push(this.allData[i]);
        }

        const valDataSize = Math.ceil(size * valSplit);
        const dataSize = size - valDataSize;

        data = shuffle(data, dataSize);
        valData = shuffle(valData, valDataSize);

        return { data, valData };
    }

    async save() {
        if (this.name === undefined) {
            throw new Error('save/load not enabled for this instance');
        }

        await fs.mkdir('data/dataset', { recursive: true });

        await fs.writeFile(
            `data/dataset/${this.name}.jsonl`,
            this.allData.map(this.toSaveFmt).map(x => JSON.stringify(x, null, 2)).join('\n'),
        );
    }

    async load() {
        if (this.name === undefined) {
            throw new Error('save/load not enabled for this instance');
        }

        this.allData.length = 0;

        const file = `data/dataset/${this.name}.jsonl`;

        if (!(await fs.stat(file)).isFile()) {
            throw new Error('No file found');
        }

        const reader = rl.createInterface({
            input: createReadStream(`data/dataset/${this.name}.jsonl`),
            crlfDelay: Infinity,
        });

        for await (const line of reader) {
            this.allData.push(this.fromSaveFmt(JSON.parse(line)));
        }

        this.trim();
    }
}

function shuffle<T>(arr: T[], size: number) {
    arr = arr.slice();

    for (let i = 0; i < size; i++) {
        const j = Math.floor(Math.random() * (arr.length - i)) + i;
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }

    return arr.slice(0, size);
}
