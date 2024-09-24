import fs from 'fs/promises';

import { exists } from './exists';

export async function addPerfLog(duration: number | string, low: number, high: number) {
    if (!await exists('data/perfLog.csv')) {
        await fs.writeFile('data/perfLog.csv', 'duration,low,high\n');
    }

    await fs.appendFile('data/perfLog.csv', `${duration},${low},${high}\n`);
}
