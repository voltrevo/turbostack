import fs from 'fs/promises';

import { exists } from './exists';

export async function addPerfLog(
    duration: number | string,
    valLoss: number,
    extra: string,
) {
    if (!await exists('data/perfLog.csv')) {
        await fs.writeFile('data/perfLog.csv', 'duration,valLoss,low,high\n');
    }

    await fs.appendFile('data/perfLog.csv', `${duration},${valLoss},${extra}\n`);
}
