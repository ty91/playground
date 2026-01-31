import { getModel, getModels, type Model } from '@mariozechner/pi-ai';

const fallbackModelIdentifier = 'gemini-2.5-flash';

export function createGoogleModel(modelIdentifier: string): Model<'google-generative-ai'> {
  const models = getModels('google');
  const existingModel = models.find((model) => model.id === modelIdentifier);

  if (existingModel) {
    return existingModel;
  }

  return getModel('google', fallbackModelIdentifier);
}
