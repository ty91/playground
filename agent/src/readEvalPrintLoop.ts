import { streamText, type ModelMessage } from 'ai';
import type { Configuration } from './configuration.js';
import { toSingleLineMessage } from './errorMessage.js';
import { createModel } from './provider/index.js';
import { writeStreamToStdout } from './stream.js';

export type ReadEvalPrintLoop = {
  start: () => Promise<void>;
};

const promptText = '> ';
const exitHintMessage = '한 번 더 누르면 종료합니다.';

export function createReadEvalPrintLoop(configuration: Configuration): ReadEvalPrintLoop {
  const model = createModel(configuration);
  const messageHistory: ModelMessage[] = [];
  let currentLine = '';
  let exitRequested = false;
  let isBusy = false;

  function printPrompt(): void {
    process.stdout.write(promptText);
  }

  function resetExitRequested(): void {
    exitRequested = false;
  }

  function requestExit(): void {
    if (exitRequested) {
      shutdown(0);
      return;
    }

    exitRequested = true;
    currentLine = '';
    process.stdout.write(`\n${exitHintMessage}\n`);
    printPrompt();
  }

  async function processLine(line: string): Promise<void> {
    const trimmed = line.trim();
    resetExitRequested();

    if (trimmed.length === 0) {
      printPrompt();
      return;
    }

    isBusy = true;
    process.stdout.write('\n');

    try {
      const userMessage: ModelMessage = { role: 'user', content: trimmed };
      messageHistory.push(userMessage);

      const result = await streamText({
        model,
        system: configuration.systemPrompt,
        messages: messageHistory
      });

      const assistantResponse = await writeStreamToStdout(result.textStream);
      messageHistory.push({ role: 'assistant', content: assistantResponse });
    } catch (error) {
      const lastMessage = messageHistory[messageHistory.length - 1];
      if (lastMessage?.role === 'user') {
        messageHistory.pop();
      }
      process.stderr.write(`${toSingleLineMessage(error)}\n`);
    } finally {
      isBusy = false;
      printPrompt();
    }
  }

  function handleData(data: string): void {
    for (const character of data) {
      if (isBusy) {
        continue;
      }

      if (character === '\u0003' || character === '\u0004') {
        requestExit();
        continue;
      }

      if (character === '\r' || character === '\n') {
        const line = currentLine;
        currentLine = '';
        void processLine(line);
        continue;
      }

      if (character === '\u007f') {
        resetExitRequested();

        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          process.stdout.write('\b \b');
        }

        continue;
      }

      if (character === '\u001b') {
        continue;
      }

      resetExitRequested();
      currentLine += character;
      process.stdout.write(character);
    }
  }

  function shutdown(exitCode: number): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    process.stdout.write('\n');
    process.exit(exitCode);
  }

  async function start(): Promise<void> {
    process.stdin.setEncoding('utf8');

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdin.on('data', handleData);
    process.stdin.resume();
    printPrompt();
  }

  return { start };
}
