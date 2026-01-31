import 'dotenv/config';
import { loadConfiguration } from './configuration.js';
import { toSingleLineMessage } from './errorMessage.js';
import { createReadEvalPrintLoop } from './readEvalPrintLoop.js';

async function main(): Promise<void> {
  try {
    const configuration = loadConfiguration();
    const readEvalPrintLoop = createReadEvalPrintLoop(configuration);
    await readEvalPrintLoop.start();
  } catch (error) {
    process.stderr.write(`${toSingleLineMessage(error)}\n`);
    process.exitCode = 1;
  }
}

void main();
