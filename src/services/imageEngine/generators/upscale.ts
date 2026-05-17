
export class ImageUpscaler {
  static async upscale(image: string, factor: number = 2) {
    const response = await fetch('/api/media/upscale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, factor })
    });

    if (!response.ok) {
      throw new Error('Image upscaling failed');
    }

    return response.json();
  }
}
