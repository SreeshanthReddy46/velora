
export * from './sdxl';
export * from './flux';
export * from './controlnet';

export enum PipelineType {
  SDXL = 'sdxl',
  FLUX = 'flux',
  CONTROLNET = 'controlnet'
}

export class ImagePipeline {
  static getModelForPipeline(type: PipelineType): string {
    switch (type) {
      case PipelineType.FLUX:
        return 'gemini-3.1-flash-image-preview'; // High quality
      case PipelineType.SDXL:
        return 'gemini-2.5-flash-image'; // General
      case PipelineType.CONTROLNET:
        return 'gemini-3.1-flash-image-preview'; // Advanced
      default:
        return 'gemini-3.1-flash-image-preview';
    }
  }
}
