export default class Stats {
    static sum(arr: number[]): number {
        return arr.reduce((a, b) => a + b);
    }

    static mean(arr: number[]): number {
        return Stats.sum(arr) / arr.length;
    }

    static stdev(arr: number[]): number {
        const mean = Stats.mean(arr);

        return Math.sqrt(
            Stats.mean(arr.map((x) => (x - mean) ** 2)),
        );
    }

    static stdevSample(arr: number[]): number {
        const mean = Stats.mean(arr);

        return Math.sqrt(
            Stats.sum(arr.map((x) => (x - mean) ** 2)) / (arr.length - 1),
        );
    }
}
