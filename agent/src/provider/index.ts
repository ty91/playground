import type { LanguageModel } from 'ai';
import type { Configuration } from '../configuration.js';
import { createGoogleModel } from './google.js';

export function createModel(configuration: Configuration): LanguageModel {
  return createGoogleModel(configuration.apiKey, configuration.modelName);
}
