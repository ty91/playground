import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

export function createGoogleModel(apiKey: string, modelName: string): LanguageModel {
  const google = createGoogleGenerativeAI({ apiKey });
  return google(modelName);
}
