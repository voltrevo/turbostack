import { promises as fs, default as fsClassic } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

import fetch from 'node-fetch-commonjs';

import { PredictionModel } from '../src/PredictionModel';
import { BoardJson } from '../src/Board';

const execAsync = promisify(exec);

async function downloadPredictionTrainingData() {
    const basePath = 'https://github.com/voltrevo/stacking-data/raw/2ac61b0/20240924-1';

    const data = [
        ...(await downloadAndParseJsonGz(`${basePath}/data.json.gz`)) as unknown[],
        ...(await downloadAndParseJsonGz(`${basePath}/turbostack-data-1727147142024.json.gz`)) as unknown[],
    ] as { from: BoardJson[], to: BoardJson[] }[];

    const dataset = PredictionModel.dataSet();

    dataset.add(data.map(dataset.fromSaveFmt));

    await dataset.save();

    console.log('done', dataset.size());
}

downloadPredictionTrainingData().catch(console.error);

async function downloadToTempFile(url: string): Promise<string> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch '${url}' (${response.status})`);
    }

    const tempFilePath = join(tmpdir(), 'downloaded-file.json.gz');
    const fileStream = fsClassic.createWriteStream(tempFilePath);

    return new Promise((resolve, reject) => {
        if (response.body === null) {
            reject(new Error('Response body is null'));
            return;
        }

        response.body.pipe(fileStream);

        response.body.on('error', (err) => {
            reject(new Error('Error writing to temp file: ' + err.message));
        });

        fileStream.on('finish', () => {
            resolve(tempFilePath);
        });
    });
}

async function unzipFile(filePath: string): Promise<string> {
    const unzippedFilePath = filePath.replace('.gz', '');

    try {
        await execAsync(`gzip -d -c ${filePath} > ${unzippedFilePath}`);
    } catch (error) {
        throw new Error('Error unzipping file: ' + (error as any).message);
    }

    return unzippedFilePath;
}

async function downloadAndParseJsonGz(url: string): Promise<any> {
    try {
        // Step 1: Download the file
        const tempFilePath = await downloadToTempFile(url);

        // Step 2: Unzip the file using external gzip
        const unzippedFilePath = await unzipFile(tempFilePath);

        // Step 3: Read the unzipped file and parse the JSON
        const fileContent = await fs.readFile(unzippedFilePath, 'utf8');
        const jsonData = JSON.parse(fileContent);

        // Clean up temp files
        await fs.unlink(tempFilePath);
        await fs.unlink(unzippedFilePath);

        return jsonData;
    } catch (error) {
        throw new Error('Error during download and parsing: ' + (error as any).message);
    }
}
