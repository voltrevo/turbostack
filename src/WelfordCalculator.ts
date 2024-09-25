export class WelfordCalculator {
    public n: number; // Count of data points
    private mean: number; // Mean of the data points
    private M2: number; // Sum of squared differences from the mean (used for variance)
    public best = -Infinity;

    constructor() {
        this.n = 0;
        this.mean = 0;
        this.M2 = 0;
    }

    // Method to add a new data point
    public update(x: number): void {
        this.n += 1;
        const delta = x - this.mean;
        this.mean += delta / this.n;
        const delta2 = x - this.mean; // delta after updating mean
        this.M2 += delta * delta2;

        if (x > this.best) {
            this.best = x;
        }
    }

    // Method to get the mean of the data points
    public getMean(): number {
        return this.mean;
    }

    // Method to get the standard deviation of the data points
    public getStdev(): number {
        if (this.n < 2) {
            return NaN; // Standard deviation is undefined for fewer than two values
        }
        const variance = this.M2 / (this.n - 1); // Sample variance
        return Math.sqrt(variance);
    }
}
