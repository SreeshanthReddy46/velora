
import { PromptEngine, PromptOptions } from '../prompts';

export class ImageToImageGenerator {
  static async transform(image: string, prompt: string, options: PromptOptions = {}) {
    const revisedPrompt = PromptEngine.expand(prompt, options);
    
    const response = await fetch('/api/media/transform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        image,
        prompt: revisedPrompt,
        options 
      })
    });

    if (!response.ok) {
      throw new Error('Image transformation failed');
    }

    return response.json();
  }
}
