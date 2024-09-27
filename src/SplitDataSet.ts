import fs from 'fs/promises';

import { validationSplit } from "./hyperParams";

export class SplitDataSet<T> {
    data: T[] = [];
    valData: T[] = [];

    constructor(
        public name: string | undefined,
        public toSaveFmt: (x: T) => unknown,
        public fromSaveFmt: (parsed: unknown) => T,
    ) {}

    add(newData: T[]) {
        const valCount = Math.ceil(newData.length * validationSplit);

        this.valData.push(...newData.slice(0, valCount));
        this.data.push(...newData.slice(valCount));
    }

    keepRecent(n: number) {
        const maxValDataN = Math.ceil(n * validationSplit);
        const maxDataN = n - maxValDataN;

        this.data = this.data.slice(-maxDataN);
        this.valData = this.valData.slice(-maxValDataN);
    }

    size() {
        return this.data.length + this.valData.length;
    }

    sample(size: number) {
        if (size > this.size()) {
            throw new Error('Can\'t make a sample that size (not enough total data)');
        }

        const valSize = Math.ceil(size * validationSplit);
        const dataSize = size - valSize;

        const res = new SplitDataSet(undefined, this.toSaveFmt, this.fromSaveFmt);
        res.data = shuffle(this.data, dataSize);
        res.valData = shuffle(this.valData, valSize);

        return res;
    }

    async save() {
        if (this.name === undefined) {
            throw new Error('save/load not enabled for this instance');
        }

        await fs.mkdir('data/dataset', { recursive: true });

        await fs.writeFile(`data/dataset/${this.name}.json`, JSON.stringify({
            data: this.data.map(this.toSaveFmt),
            valData: this.valData.map(this.toSaveFmt),
        }));
    }

    async load() {
        if (this.name === undefined) {
            throw new Error('save/load not enabled for this instance');
        }

        let raw;
        let saved;

        try {
            raw = await fs.readFile(`data/dataset/${this.name}.json`, 'utf8');
        } catch {
            raw = undefined;
        }

        if (raw === undefined) {
            saved = undefined;
        } else {
            const jsonBoards: {
                data: unknown[],
                valData: unknown[],
            } = JSON.parse(raw);

            if (!Array.isArray(jsonBoards.data) || !Array.isArray(jsonBoards.valData)) {
                throw new Error('Expected array');
            }

            saved = {
                data: jsonBoards.data.map(this.fromSaveFmt),
                valData: jsonBoards.valData.map(this.fromSaveFmt),
            };
        }

        if (saved !== undefined) {
            this.data = saved.data;
            this.valData = saved.valData;
        }
    }

    async loadMulti() {
        // instead of just `data/dataset/${this.name}.json`
        // we want `data/dataset/${this.name}-*.json`
        // find matches (if zero, throw)
        // load each, merge

        if (this.name === undefined) {
            throw new Error('save/load not enabled for this instance');
        }

        let names: string[] = [];

        names = await Promise.all(
            (await fs.readdir('data/dataset'))
                .filter(f => f.startsWith(`${this.name}-`) && f.endsWith('.json'))
                .map(async f => f.slice(0, -('.json'.length))),
        );

        if (names.length === 0) {
            throw new Error('No files found');
        }

        const datasets = await Promise.all(
            names.map(async name => {
                const ds = new SplitDataSet(name, this.toSaveFmt, this.fromSaveFmt);

                try {
                    await ds.load();
                } catch (e) {
                    console.error(`Error loading ${name}: ${e}`);
                }

                return ds;
            }),
        );

        this.data = [];
        this.valData = [];

        for (const ds of datasets) {
            this.data.push(...ds.data);
            this.valData.push(...ds.valData);
        }
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
