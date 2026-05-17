
/**
 * Advanced Prompt Expansion Engine
 * Designed to transform simple user inputs into high-fidelity neural specs.
 */

export interface PromptOptions {
  style?: string;
  resolution?: '1K' | '2K' | '4K';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  fidelity?: 'standard' | 'high' | 'ultra';
}

const FIDELITY_MODIFIERS = {
  standard: "high quality, detailed",
  high: "hyper-realistic, 4k resolution, cinematic lighting, sharp focus",
  ultra: "masterpiece, ultra-high definition, 8k resolution, shot on 35mm lens, depth of field, ray tracing, global illumination, unreal engine 5 render style, hyper-detailed textures"
};

const STYLE_MODIFIERS: Record<string, string> = {
  realistic: "photorealistic, professional photography, raw photo, natural lighting",
  surreal: "ethereal atmosphere, dreamlike quality, vivid colors, magical realism",
  cyberpunk: "neon glow, futuristic aesthetic, rainy streets, high-contrast, synthwave colors",
  minimal: "clean minimalist design, geometric simplicity, solid background, high-end studio lighting",
  vibrant: "highly saturated, pop art style, energetic composition, bold colors"
};

export class PromptEngine {
  static expand(prompt: string, options: PromptOptions = {}): string {
    const { 
      style = 'realistic', 
      fidelity = 'ultra', 
      resolution = '4K' 
    } = options;

    const styleMod = STYLE_MODIFIERS[style] || STYLE_MODIFIERS.realistic;
    const fidelityMod = FIDELITY_MODIFIERS[fidelity];
    const resMod = `${resolution} UHD`;

    // Clean the prompt
    let cleanPrompt = prompt.trim();
    if (cleanPrompt.endsWith('.')) cleanPrompt = cleanPrompt.slice(0, -1);

    // Assembly
    return `${cleanPrompt}, ${styleMod}, ${fidelityMod}, ${resMod}, perfection, highly detailed, sharp edges, voluminous atmosphere.`;
  }

  static getResolutionSize(res?: string): { width: number, height: number } {
    switch (res) {
      case '4K': return { width: 3840, height: 2160 };
      case '2K': return { width: 2560, height: 1440 };
      case '1K': 
      default: return { width: 1024, height: 1024 };
    }
  }
}
