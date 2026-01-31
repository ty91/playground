import { getModel, getModels, type Model } from '@mariozechner/pi-ai';
import type { Configuration } from '../configuration.js';

const fallbackModelIdentifier = 'gemini-2.5-flash';

export function createModel(configuration: Configuration): Model<'google-generative-ai'> {
  const modelIdentifier = configuration.modelIdentifier;
  const models = getModels('google');
  const existingModel = models.find((model) => model.id === modelIdentifier);

  if (existingModel) {
    return existingModel;
  }

  const baseModel = getModel('google', fallbackModelIdentifier);
  return {
    ...baseModel,
    id: modelIdentifier,
    name: formatModelName(modelIdentifier)
  };
}

function formatModelName(modelIdentifier: string): string {
  if (!modelIdentifier.startsWith('gemini-')) {
    return modelIdentifier;
  }

  const normalized = modelIdentifier.replace(/^gemini-/, '').replace(/-/g, ' ');
  return `Gemini ${normalized}`;
}
