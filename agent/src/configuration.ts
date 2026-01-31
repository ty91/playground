import { systemPrompt } from './systemPrompt.js';

export type Configuration = {
  apiKey: string;
  modelName: string;
  systemPrompt: string;
};

const modelName = 'gemini-3-flash-preview';

export function loadConfiguration(): Configuration {
  return {
    apiKey: resolveApiKey(),
    modelName,
    systemPrompt
  };
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
