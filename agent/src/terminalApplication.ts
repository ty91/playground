import { Agent, type AgentEvent, type AgentMessage } from '@mariozechner/pi-agent-core';
import type { AssistantMessageEvent } from '@mariozechner/pi-ai';
import { Input, ProcessTerminal, Text, TUI, matchesKey } from '@mariozechner/pi-tui';
import type { Configuration } from './configuration.js';
import { toSingleLineMessage } from './errorMessage.js';
import { createModel } from './provider/index.js';

type ConversationEntry = {
  role: 'user' | 'assistant';
  content: string;
};

export type TerminalApplication = {
  start: () => void;
  stop: () => void;
};

const exitHintMessage = '한 번 더 누르면 종료합니다.';
const busyMessage = '응답 중...';

class ExitAwareInput extends Input {
  private readonly handleExitAttempt: () => void;
  private readonly handleNonExitInput: () => void;

  constructor(handleExitAttempt: () => void, handleNonExitInput: () => void) {
    super();
    this.handleExitAttempt = handleExitAttempt;
    this.handleNonExitInput = handleNonExitInput;
  }

  handleInput(data: string): void {
    if (matchesKey(data, 'ctrl+d') || matchesKey(data, 'ctrl+c') || matchesKey(data, 'escape')) {
      this.handleExitAttempt();
      return;
    }

    this.handleNonExitInput();
    super.handleInput(data);
  }
}

export function createTerminalApplication(configuration: Configuration): TerminalApplication {
  const model = createModel(configuration);
  const agent = new Agent({
    initialState: {
      systemPrompt: configuration.systemPrompt,
      model,
      tools: []
    },
    getApiKey: () => configuration.apiKey
  });

  const conversationEntries: ConversationEntry[] = [];
  let streamingAssistantIndex: number | null = null;
  let exitRequested = false;
  let busy = false;
  let statusMessage = '';

  const terminal = new ProcessTerminal();
  const terminalUserInterface = new TUI(terminal);

  const conversationText = new Text('', 1, 0);
  const statusText = new Text('', 1, 0);
  const input = new ExitAwareInput(requestExit, resetExitRequested);

  input.onSubmit = (value) => {
    void handleSubmit(value);
  };

  terminalUserInterface.addChild(conversationText);
  terminalUserInterface.addChild(statusText);
  terminalUserInterface.addChild(input);
  terminalUserInterface.setFocus(input);

  agent.subscribe((event) => {
    handleAgentEvent(event);
  });

  function updateConversationText(): void {
    conversationText.setText(formatConversation(conversationEntries));
    terminalUserInterface.requestRender();
  }

  function updateStatusText(): void {
    const message = exitRequested ? exitHintMessage : statusMessage || (busy ? busyMessage : '');
    statusText.setText(message);
    terminalUserInterface.requestRender();
  }

  function setBusy(value: boolean): void {
    busy = value;
    updateStatusText();
  }

  function requestExit(): void {
    if (exitRequested) {
      shutdown(0);
      return;
    }

    exitRequested = true;
    updateStatusText();
  }

  function resetExitRequested(): void {
    if (!exitRequested) {
      return;
    }

    exitRequested = false;
    updateStatusText();
  }

  async function handleSubmit(value: string): Promise<void> {
    resetExitRequested();
    statusMessage = '';

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      input.setValue('');
      terminalUserInterface.requestRender();
      return;
    }

    if (busy) {
      updateStatusText();
      return;
    }

    input.setValue('');
    terminalUserInterface.requestRender();
    setBusy(true);

    try {
      await agent.prompt(trimmed);
    } catch (error) {
      const message = toSingleLineMessage(error);
      appendAssistantMessage(`오류: ${message}`);
      statusMessage = `오류: ${message}`;
      updateStatusText();
    } finally {
      setBusy(false);
    }
  }

  function handleAgentEvent(event: AgentEvent): void {
    if (event.type === 'message_start') {
      handleMessageStart(event.message);
      return;
    }

    if (event.type === 'message_update') {
      handleMessageUpdate(event.assistantMessageEvent);
      return;
    }

    if (event.type === 'message_end') {
      handleMessageEnd(event.message);
      return;
    }

    if (event.type === 'agent_end') {
      const errorMessage = event.messages.find(
        (message) => message.role === 'assistant' && message.errorMessage
      );
      if (errorMessage && errorMessage.role === 'assistant' && errorMessage.errorMessage) {
        handleMessageEnd(errorMessage);
      }
    }
  }

  function handleMessageStart(message: AgentMessage): void {
    if (message.role === 'user') {
      appendUserMessage(extractUserText(message));
      return;
    }

    if (message.role === 'assistant') {
      startAssistantMessage();
    }
  }

  function handleMessageUpdate(assistantMessageEvent: AssistantMessageEvent): void {
    if (assistantMessageEvent.type !== 'text_delta') {
      return;
    }

    appendAssistantDelta(assistantMessageEvent.delta);
  }

  function handleMessageEnd(message: AgentMessage): void {
    if (message.role !== 'assistant') {
      return;
    }

    if (message.errorMessage) {
      const errorText = `오류: ${message.errorMessage}`;
      if (streamingAssistantIndex !== null) {
        conversationEntries[streamingAssistantIndex].content = errorText;
        streamingAssistantIndex = null;
        updateConversationText();
      } else {
        appendAssistantMessage(errorText);
      }
      statusMessage = errorText;
      updateStatusText();
      return;
    }

    const finalText = extractAssistantText(message);
    if (streamingAssistantIndex === null) {
      appendAssistantMessage(finalText);
      return;
    }

    conversationEntries[streamingAssistantIndex].content = finalText;
    streamingAssistantIndex = null;
    updateConversationText();
  }

  function appendUserMessage(text: string): void {
    conversationEntries.push({ role: 'user', content: text });
    updateConversationText();
  }

  function startAssistantMessage(): void {
    streamingAssistantIndex = conversationEntries.length;
    conversationEntries.push({ role: 'assistant', content: '' });
    updateConversationText();
  }

  function appendAssistantDelta(delta: string): void {
    if (streamingAssistantIndex === null) {
      startAssistantMessage();
    }

    const index = streamingAssistantIndex ?? conversationEntries.length - 1;
    conversationEntries[index].content += delta;
    updateConversationText();
  }

  function appendAssistantMessage(text: string): void {
    conversationEntries.push({ role: 'assistant', content: text });
    updateConversationText();
  }

  function extractUserText(message: AgentMessage): string {
    if (message.role !== 'user') {
      return '';
    }

    if (typeof message.content === 'string') {
      return message.content;
    }

    return message.content
      .filter((content) => content.type === 'text')
      .map((content) => content.text)
      .join('');
  }

  function extractAssistantText(message: AgentMessage): string {
    if (message.role !== 'assistant') {
      return '';
    }

    return message.content
      .filter((content) => content.type === 'text')
      .map((content) => content.text)
      .join('');
  }

  function formatConversation(entries: ConversationEntry[]): string {
    return entries
      .map((entry) => `${formatRoleLabel(entry.role)} ${entry.content}`.trim())
      .join('\n\n');
  }

  function formatRoleLabel(role: ConversationEntry['role']): string {
    return role === 'user' ? '사용자:' : 'assistant:';
  }

  function shutdown(exitCode: number): void {
    terminalUserInterface.stop();
    process.stdout.write('\n');
    process.exit(exitCode);
  }

  function start(): void {
    terminalUserInterface.start();
  }

  function stop(): void {
    terminalUserInterface.stop();
  }

  return { start, stop };
}
