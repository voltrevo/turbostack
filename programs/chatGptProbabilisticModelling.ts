import * as tf from '@tensorflow/tfjs-node';

// Function to generate synthetic data
function generateData(numSamples: number) {
    const xData = [];
    const yData = [];

    for (let i = 0; i < numSamples; i++) {
        const x0 = Math.random();
        const x1 = Math.random();
        const x2 = Math.random();

        // Mean is a linear function of the inputs
        const mean = 3 * x0 + 2 * x1 - x2;

        // Standard deviation is also a function of the inputs (positive)
        const std = Math.abs(0.5 * x0 + 0.1 * x1 + 0.2 * x2 + 0.1);

        // Sample y from a normal distribution with the given mean and std
        const y = mean + std * randn_bm(); // Use custom random normal function

        xData.push([x0, x1, x2]);
        yData.push([y, 0]); // Add a dummy value to make yData shape [numSamples, 2]
    }

    return { xData: tf.tensor2d(xData), yData: tf.tensor2d(yData) };
}

// Custom function to generate random numbers from a normal distribution
function randn_bm() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); // Convert [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Define a model with two outputs: mean (μ) and standard deviation (σ)
function createModel() {
    const model = tf.sequential();

    // Add layers
    model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [3] }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));

    // Output two values: mean and log(standard deviation)
    model.add(tf.layers.dense({ units: 2 }));

    model.summary();

    return model;
}

// Function to extract mean and std from the model's output
function getMeanAndStd(output: tf.Tensor2D) {
    const mean = output.slice([0, 0], [-1, 1]); // First value is mean
    const logStd = output.slice([0, 1], [-1, 1]); // Second value is log of standard deviation
    const std = tf.add(tf.softplus(logStd), 1e-6); // Apply softplus to ensure std > 0
    return { mean, std };
}

// Custom negative log-likelihood loss function
function negativeLogLikelihood(yTrue: tf.Tensor, yPred: tf.Tensor) {
    // Predicted mean and log(std)
    const mean = yPred.slice([0, 0], [-1, 1]);
    const logStd = yPred.slice([0, 1], [-1, 1]);

    // Actual y values from yTrue (first column)
    const yTrueValue = yTrue.slice([0, 0], [-1, 1]);

    // Convert log(std) to std
    const std = tf.add(tf.softplus(logStd), 1e-6); // Ensure positive std
    const variance = tf.square(std);

    // Negative log-likelihood computation
    const logLikelihood = tf.add(
        tf.div(tf.square(tf.sub(yTrueValue, mean)), tf.mul(2, variance)), // (yTrue - mean)^2 / (2 * variance)
        tf.log(std) // log(std)
    ).add(0.5 * Math.log(2 * Math.PI)); // Constant term

    // Return mean negative log-likelihood
    return tf.mean(logLikelihood);
}

// Training and evaluation
async function run() {
    const numSamples = 200_000;

    // Generate training data
    const { xData, yData } = generateData(numSamples);

    console.log('Data shapes:', xData.shape, yData.shape);

    // Create and compile the model
    const model = createModel();
    model.compile({
        optimizer: tf.train.adam(),
        loss: negativeLogLikelihood,
    });

    console.log('Training the model...');

    // Train the model
    await model.fit(xData, yData, {
        epochs: 5,
        batchSize: 512,
        validationSplit: 0.2
    });

    console.log('Model training complete.');

    // Test the model with some example inputs
    const exampleInputs = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6], [0.7, 0.8, 0.9]];
    const exampleTensor = tf.tensor2d(exampleInputs, [3, 3]);

    const predictions = model.predict(exampleTensor) as tf.Tensor2D;
    const { mean, std } = getMeanAndStd(predictions);

    // Calculate correct mean and standard deviation for comparison
    const correctMeans = exampleInputs.map(([x0, x1, x2]) => 3 * x0 + 2 * x1 - x2);
    const correctStds = exampleInputs.map(([x0, x1, x2]) => Math.abs(0.5 * x0 + 0.1 * x1 + 0.2 * x2 + 0.1));

    // Fetch predictions from tensors
    const predictedMeans = (await mean.array()) as number[][];
    const predictedStds = (await std.array()) as number[][];

    // Print results
    console.log('Example inputs, correct and predicted mean and standard deviation:');
    exampleInputs.forEach((input, index) => {
        console.log(`Input: ${input}`);
        console.log(`Correct Mean: ${correctMeans[index].toFixed(4)}, Correct Std: ${correctStds[index].toFixed(4)}`);
        console.log(`Predicted Mean: ${predictedMeans[index][0].toFixed(4)}, Predicted Std: ${predictedStds[index][0].toFixed(4)}`);
        console.log('-------------------------------------');
    });

    // Clean up tensors
    xData.dispose();
    yData.dispose();
    exampleTensor.dispose();
    mean.dispose();
    std.dispose();
    predictions.dispose();
}

// Run the test
run();
