export default function softmax(x: number[], temperature: number): number[] {
    const max = Math.max(...x);

    if (temperature === 0) {
        const maxIndex = x.indexOf(max);
        return x.map((v, i) => i === maxIndex ? 1 : 0);
    }

    const e = x.map((v) => Math.exp((v - max) / temperature));
    const sum = e.reduce((a, b) => a + b);
    return e.map((v) => v / sum);
}
