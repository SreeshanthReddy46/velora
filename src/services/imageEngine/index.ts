
export * from './prompts';
export * from './generators/textToImage';
export * from './pipelines';

import { TextToImageGenerator } from './generators/textToImage';
import { PromptOptions } from './prompts';

export const ImageEngine = {
  async synthesize(prompt: string, options?: PromptOptions) {
    return TextToImageGenerator.generate(prompt, options);
  }
};
