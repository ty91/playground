import { systemPrompt } from './systemPrompt.js';

export type Configuration = {
  apiKey: string;
  modelIdentifier: string;
  systemPrompt: string;
};

const defaultModelIdentifier = 'gemini-3-flash-preview';

export function loadConfiguration(): Configuration {
  return {
    apiKey: resolveApiKey(),
    modelIdentifier: resolveModelIdentifier(),
    systemPrompt
  };
}

function resolveModelIdentifier(): string {
  return process.env.GEMINI_MODEL ?? defaultModelIdentifier;
}

function resolveApiKey(): string {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing Google API key. Set GOOGLE_GENERATIVE_AI_API_KEY, GOOGLE_API_KEY, or GEMINI_API_KEY.'
    );
  }

  return apiKey;
}
