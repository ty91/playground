import type { Configuration } from './configuration.js';
import { createTerminalApplication } from './terminalApplication.js';

export type ReadEvalPrintLoop = {
  start: () => Promise<void>;
};

export function createReadEvalPrintLoop(configuration: Configuration): ReadEvalPrintLoop {
  const terminalApplication = createTerminalApplication(configuration);

  return {
    start: async () => {
      terminalApplication.start();
    }
  };
}
