import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

app.use(express.json());

// Neural Core Configuration
const NEURAL_MODEL_CHAT = "gemini-2.0-flash-exp"; // Ultra-fast generation
const NEURAL_MODEL_CHAT_PRO = "gemini-1.5-pro"; // Deep reasoning
const NEURAL_MODEL_EMBED = "text-embedding-004";

// Initialize Neural Core
const neuralCore = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'vion-neural-engine-v1',
    }
  }
});

// Neural Retry Logic (Exponential Backoff for 429s)
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || 
                         error.message?.includes('RESOURCE_EXHAUSTED') ||
                         (error.status === 429);
      
      if (isRateLimit && retries < maxRetries) {
        retries++;
        const delay = initialDelay * Math.pow(2, retries - 1) + Math.random() * 500;
        console.warn(`[Neural Retry] Rate limit hit. Backing off ${Math.round(delay)}ms... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

// Lazy Pinecone init
let pc: Pinecone | null = null;
const getPinecone = () => {
  if (!pc) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) return null;
    pc = new Pinecone({ apiKey });
  }
  return pc;
};

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Proprietary Neural Engine Architecture
class NeuralLayer {
  static async compute(input: string, core: string = "vion-alpha-v1"): Promise<string> {
    // This is where internal neural weights would be applied
    // For now, it acts as the gateway to the neural core
    return input;
  }
}

class VionNeuralCore {
  private static k1 = 1.6;
  private static b = 0.75;

  private static tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  static calculateBM25(query: string, documents: { id: string, text: string }[]): Map<string, number> {
    const scores = new Map<string, number>();
    const queryTerms = this.tokenize(query);
    if (queryTerms.length === 0 || documents.length === 0) return scores;

    const docTokens = documents.map(d => this.tokenize(d.text));
    const avgdl = docTokens.reduce((sum, d) => sum + d.length, 0) / documents.length;
    const N = documents.length;

    const df = new Map<string, number>();
    queryTerms.forEach(term => {
      let count = 0;
      docTokens.forEach(tokens => {
        if (tokens.includes(term)) count++;
      });
      df.set(term, count);
    });

    documents.forEach((doc, i) => {
      let score = 0;
      const tokens = docTokens[i];
      const dl = tokens.length;

      queryTerms.forEach(term => {
        const n_q = df.get(term) || 0;
        const idf = Math.log(1 + (N - n_q + 0.5) / (n_q + 0.5));
        const tf = tokens.filter(t => t === term).length;
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (dl / avgdl));
        score += idf * (numerator / denominator);
      });
      if (score > 0) scores.set(doc.id, score);
    });

    return scores;
  }

  static cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

app.post("/api/compute/vectorize", async (req, res) => {
  try {
    const { text, batch } = req.body;
    
    if (batch) {
      const model = (neuralCore as any).getGenerativeModel({ model: NEURAL_MODEL_EMBED });
      const result = await withRetry(() => model.batchEmbedContents({
        requests: batch.map((t: string) => ({
          content: { role: 'user', parts: [{ text: t }] }
        }))
      })) as any;
      return res.json({ embeddings: result.embeddings.map((e: any) => e.values) });
    }

    const model = (neuralCore as any).getGenerativeModel({ model: NEURAL_MODEL_EMBED });
    const result = await withRetry(() => model.embedContent(text)) as any;
    res.json({ embedding: result.embedding.values });
  } catch (error: any) {
    console.error("Internal Vectorization Error:", error);
    res.status(500).json({ error: "Core sequence interrupted" });
  }
});

app.post("/api/agent/interact", async (req, res) => {
  try {
    const { prompt, history, systemInstruction, chunks, performHybridSearch } = req.body;
    
    let finalContext = "";
    if (performHybridSearch && chunks && chunks.length > 0) {
      // 1. Process Neural Encoding for Query
      const model = (neuralCore as any).getGenerativeModel({ model: NEURAL_MODEL_EMBED });
      const queryResult = await withRetry(() => model.embedContent(prompt)) as any;
      const queryEmbedding = queryResult.embedding.values;

      // 2. Compute Scores
      const vectorScores = new Map<string, number>();
      chunks.forEach((c: any) => {
        if (c.embedding) {
          vectorScores.set(c.id, VionNeuralCore.cosineSimilarity(queryEmbedding, c.embedding));
        }
      });

      const bm25Scores = VionNeuralCore.calculateBM25(prompt, chunks);

      // 3. Normalize and Blend
      const maxV = Math.max(...Array.from(vectorScores.values()), 0.001);
      const maxB = Math.max(...Array.from(bm25Scores.values()), 0.001);

      const combined = chunks.map((c: any) => ({
        ...c,
        hybridScore: ((vectorScores.get(c.id) || 0) / maxV * 0.7) + ((bm25Scores.get(c.id) || 0) / maxB * 0.3)
      })).sort((a: any, b: any) => b.hybridScore - a.hybridScore).slice(0, 10);

      finalContext = `\n[INTERNAL NEURAL RETRIEVAL - BM25 & VECTOR BLEND]:\n${combined.map((c: any) => `Source: ${c.metadata?.fileName || 'Memory'}\nRelevance: ${c.hybridScore.toFixed(4)}\nContent: ${c.text}`).join('\n---\n')}`;
    }

    const neuralInstruction = `${systemInstruction}\n${finalContext}`;
    
    // Choose model based on intent/mode implicitly passed or via instruction detection
    const isPro = neuralInstruction.includes('Pulse') || neuralInstruction.includes('researcher');
    const selectedModel = isPro ? NEURAL_MODEL_CHAT_PRO : NEURAL_MODEL_CHAT;
    
    console.log(`[Neural Engine] Routing message to ${selectedModel} (Pro: ${isPro})`);

    const result = await withRetry(async () => {
      const model = (neuralCore as any).getGenerativeModel({ model: selectedModel });
      return model.generateContentStream({
        contents: [
          ...(history || []),
          { role: 'user', parts: [{ text: prompt }] }
        ],
        systemInstruction: neuralInstruction,
        generationConfig: {
          maxOutputTokens: isPro ? 8192 : 4096,
          temperature: isPro ? 0.7 : 0.9,
          topP: 0.95,
          topK: 40
        }
      });
    });

    const stream = (result as any).stream;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of stream) {
      const chunkText = typeof chunk.text === 'function' ? chunk.text() : (chunk as any).text;
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error("Chat error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

app.post("/api/rag/upsert", async (req, res) => {
  try {
    const pinecone = getPinecone();
    if (!pinecone) return res.status(400).json({ error: "Pinecone not configured" });

    const { vectors, namespace } = req.body;
    const index = pinecone.index(process.env.PINECONE_INDEX || 'vion');
    await index.namespace(namespace || 'default').upsert(vectors);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/rag/query", async (req, res) => {
  try {
    const pinecone = getPinecone();
    if (!pinecone) return res.status(400).json({ error: "Pinecone not configured" });

    const { vector, topK, namespace } = req.body;
    const index = pinecone.index(process.env.PINECONE_INDEX || 'vion');
    const result = await index.namespace(namespace || 'default').query({
      vector,
      topK: topK || 5,
      includeMetadata: true,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/media/generate", async (req, res) => {
  try {
    const { prompt, options } = req.body;
    
    // Advanced Prompt Expansion (Server-side implementation)
    const styleMod = options?.style === 'surreal' ? "dreamy ethereal atmosphere, vivid deep colors, intricate details, magical lighting, surreal masterpiece" :
                   options?.style === 'cyberpunk' ? "neon lights, futuristic cityscape, cinematic cyberpunk aesthetic, glowing circuitry" :
                   options?.style === 'vibrant' ? "extremely vivid colors, pop art influence, high saturation, energetic composition" :
                   options?.style === 'minimal' ? "ultramodern minimalist aesthetic, clean geometric lines, high-end high-fidelity design" :
                   "photorealistic, professional photography, raw photo, natural lighting, cinematic lighting, sharp focus";

    const fidelityMod = "masterpiece, ultra-high definition, 8k textures, intricate detail, perfection, sharp edges, voluminous atmosphere";
    
    let revisedPrompt = `${prompt}, ${styleMod}, ${fidelityMod}, high resolution, 4k uhd`;
    
    if (options?.negativePrompt && options.negativePrompt.trim()) {
      revisedPrompt += ` [Negative Prompt: ${options.negativePrompt}]`;
    }

    console.log(`[Neural Synthesis] Generating image with prompt: ${revisedPrompt}`);

    const modelName = "gemini-3.1-flash-image-preview";
    
    const result = await withRetry(() => neuralCore.models.generateContent({
      model: modelName,
      contents: {
        parts: [{ text: revisedPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: options?.aspectRatio || "1:1",
          imageSize: options?.resolution || "1K" // gemini-3.1-flash-image-preview supports 1K, 2K, 4K
        }
      }
    }));

    let imageUrl = "";
    for (const part of result.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      throw new Error("No image data returned from neural core");
    }

    res.json({ imageUrl });
  } catch (error: any) {
    console.error("Media generation error:", error);
    // Fallback to gemini-2.5-flash-image if the premium model fails or is unavailable
    try {
      console.warn("[Neural Synthesis] Falling back to standard model...");
      const { prompt, options } = req.body;
      let fallbackPrompt = `High quality, photorealistic image of: ${prompt}`;
      if (options?.negativePrompt) {
        fallbackPrompt += ` (Exclude: ${options.negativePrompt})`;
      }
      const result = await withRetry(() => neuralCore.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [{ text: fallbackPrompt }]
        }
      }));

      let imageUrl = "";
      for (const part of result.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
      if (imageUrl) return res.json({ imageUrl });
    } catch (fallbackError) {
      console.error("Fallback generation failed:", fallbackError);
    }
    
    res.status(500).json({ error: "Neural synthesis sequence failed" });
  }
});

app.post("/api/media/upscale", async (req, res) => {
  try {
    const { image, factor } = req.body;
    console.log(`[Neural Engine] Upscaling image by factor ${factor || 2}...`);
    
    // Simulate high-fidelity pixel reconstruction
    // In a real production environment, this would call a specialized SR (Super Resolution) API
    // Here we leverage the premium model to "re-imagine" the image with higher detail density
    const result = await withRetry(() => neuralCore.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/png", data: image.split(',')[1] } },
          { text: "Enhance this image to ultra-high 4K resolution. Increase texture detail, sharpen edges, and remove noise while preserving original content perfectly. Masterwork quality." }
        ]
      },
      config: {
        imageConfig: {
          imageSize: "4K"
        }
      }
    }));

    let imageUrl = "";
    for (const part of result.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) throw new Error("Upscale operation yielded no pixels");
    res.json({ imageUrl });
  } catch (error: any) {
    console.error("Upscale error:", error);
    res.status(500).json({ error: "Neural upscaling failed" });
  }
});

app.post("/api/media/transform", async (req, res) => {
  try {
    const { image, prompt, options } = req.body;
    console.log(`[Neural Engine] Transforming image with prompt: ${prompt}`);
    
    const result = await withRetry(() => neuralCore.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/png", data: image.split(',')[1] } },
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
          imageSize: options?.resolution || "1K"
        }
      }
    }));

    let imageUrl = "";
    for (const part of result.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) throw new Error("Transformation failed");
    res.json({ imageUrl });
  } catch (error: any) {
    console.error("Transformation error:", error);
    res.status(500).json({ error: "Image transformation failed" });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
