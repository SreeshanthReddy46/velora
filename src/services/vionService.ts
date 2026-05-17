import { Message, AgentType, FileNode, Chunk } from "../types";

export interface AgentExecutionResult {
  nextAgent: AgentType | 'complete';
  message: string;
  activityLabel: string;
  activityDescription: string;
  filesUpdated?: FileNode[];
  thoughtProcess?: string[];
}

/**
 * Tiered Cache for Velora
 * L1: In-memory Map for sub-millisecond access
 * L2: IndexedDB for persistent storage across reloads
 */
class VeloraCache {
  private static DB_NAME = 'velora_v1';
  private static EMBED_STORE = 'embedding_cache';
  private static RESPONSE_STORE = 'response_cache';
  private static db: IDBDatabase | null = null;
  private static memoryCache = new Map<string, any>();

  private static async initDB(): Promise<IDBDatabase | null> {
    if (this.db) return this.db;
    if (typeof window === 'undefined') return null;

    try {
      return await new Promise((resolve, reject) => {
        const request = indexedDB.open(this.DB_NAME, 2);
        request.onupgradeneeded = (event: any) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.EMBED_STORE)) {
            db.createObjectStore(this.EMBED_STORE);
          }
          if (!db.objectStoreNames.contains(this.RESPONSE_STORE)) {
            db.createObjectStore(this.RESPONSE_STORE);
          }
        };
        request.onsuccess = () => {
          this.db = request.result;
          resolve(this.db);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("IndexedDB initialization failed", e);
      return null;
    }
  }

  static async getEmbedding(text: string): Promise<number[] | null> {
    const key = `embed_${text}`;
    if (this.memoryCache.has(key)) return this.memoryCache.get(key);

    const db = await this.initDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.EMBED_STORE, 'readonly');
        const store = tx.objectStore(this.EMBED_STORE);
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result) this.memoryCache.set(key, req.result);
          resolve(req.result || null);
        };
        req.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  }

  static async setEmbedding(text: string, embedding: number[]) {
    const key = `embed_${text}`;
    this.memoryCache.set(key, embedding);
    const db = await this.initDB();
    if (!db) return;
    try {
      const tx = db.transaction(this.EMBED_STORE, 'readwrite');
      const store = tx.objectStore(this.EMBED_STORE);
      store.put(embedding, key);
    } catch {}
  }

  static async getResponse(promptKey: string): Promise<string | null> {
    if (this.memoryCache.has(promptKey)) return this.memoryCache.get(promptKey);

    const db = await this.initDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.RESPONSE_STORE, 'readonly');
        const store = tx.objectStore(this.RESPONSE_STORE);
        const req = store.get(promptKey);
        req.onsuccess = () => {
          if (req.result) this.memoryCache.set(promptKey, req.result);
          resolve(req.result || null);
        };
        req.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  }

  static async setResponse(promptKey: string, response: string) {
    this.memoryCache.set(promptKey, response);
    const db = await this.initDB();
    if (!db) return;
    try {
      const tx = db.transaction(this.RESPONSE_STORE, 'readwrite');
      const store = tx.objectStore(this.RESPONSE_STORE);
      store.put(response, promptKey);
    } catch {}
  }
}

export class VectorStore {
  private static k1 = 1.5;
  private static b = 0.75;

  private static tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  private static calculateBM25(query: string, chunks: Chunk[]): Map<string, number> {
    const scores = new Map<string, number>();
    const queryTerms = this.tokenize(query);
    if (queryTerms.length === 0) return scores;

    const docTokens = chunks.map(c => this.tokenize(c.text));
    const avgdl = docTokens.reduce((sum, d) => sum + d.length, 0) / chunks.length;
    const N = chunks.length;

    // DF (Document Frequency)
    const df = new Map<string, number>();
    queryTerms.forEach(term => {
      let count = 0;
      docTokens.forEach(tokens => {
        if (tokens.includes(term)) count++;
      });
      df.set(term, count);
    });

    chunks.forEach((chunk, i) => {
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

      if (score > 0) scores.set(chunk.id, score);
    });

    return scores;
  }

  private static cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  static async getEmbeddings(text: string): Promise<number[]> {
    const cached = await VeloraCache.getEmbedding(text);
    if (cached) return cached;

    const response = await fetch('/api/compute/vectorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    
    const embedding = data.embedding;
    await VeloraCache.setEmbedding(text, embedding);
    return embedding;
  }

  static async getEmbeddingsBatch(textList: string[]): Promise<number[][]> {
    const results: number[][] = new Array(textList.length);
    const toFetch: { text: string; index: number }[] = [];

    await Promise.all(textList.map(async (text, i) => {
      const cached = await VeloraCache.getEmbedding(text);
      if (cached) {
        results[i] = cached;
      } else {
        toFetch.push({ text, index: i });
      }
    }));

    if (toFetch.length > 0) {
      // Chunk batch requests to stay within API limits (max 100 per call)
      const CHUNK_SIZE = 50; 
      for (let i = 0; i < toFetch.length; i += CHUNK_SIZE) {
        const chunk = toFetch.slice(i, i + CHUNK_SIZE);
        const response = await fetch('/api/compute/vectorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch: chunk.map(item => item.text) })
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        data.embeddings.forEach((emb: number[], j: number) => {
          const originalIndex = chunk[j].index;
          results[originalIndex] = emb;
          VeloraCache.setEmbedding(chunk[j].text, emb);
        });
      }
    }

    return results;
  }

  static async findRelevantContext(query: string, queryEmbedding: number[], chunks: Chunk[], topK = 15): Promise<Chunk[]> {
    if (chunks.length === 0) return [];

    // 1. Vector Search Scores
    const vectorScores = new Map<string, number>();
    chunks.forEach(chunk => {
      if (chunk.embedding) {
        vectorScores.set(chunk.id, this.cosineSimilarity(queryEmbedding, chunk.embedding));
      }
    });

    // 2. BM25 Keyword Search Scores
    const bm25Scores = this.calculateBM25(query, chunks);

    // 3. Hybrid Scoring (Combined via normalization or simple weighted sum)
    const maxVector = Math.max(...Array.from(vectorScores.values()), 0.001);
    const maxBM25 = Math.max(...Array.from(bm25Scores.values()), 0.001);

    const hybridResults = chunks.map(chunk => {
      const vScore = (vectorScores.get(chunk.id) || 0) / maxVector;
      const bScore = (bm25Scores.get(chunk.id) || 0) / maxBM25;
      
      let finalScore = (vScore * 0.7) + (bScore * 0.3);

      if (chunk.metadata?.type === 'history' && finalScore > 0.1) {
        finalScore *= 1.2;
      }

      return { ...chunk, score: finalScore };
    });

    const topMatchedChunks = hybridResults
      .sort((a, b) => b.score - a.score)
      .slice(0, topK * 2);

    // 4. File-Centric Scoring (Aggregation)
    const fileScores = new Map<string, number>();
    topMatchedChunks.forEach(c => {
      const currentMax = fileScores.get(c.fileId) || 0;
      if (c.score > currentMax) fileScores.set(c.fileId, c.score);
    });

    const topFiles = Array.from(fileScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8) 
      .map(entry => entry[0]);

    // 5. Cohesive Context Construction
    const allRelevantChunksMap = new Map<string, Chunk & { score: number }>();
    
    topMatchedChunks.slice(0, topK).forEach(c => allRelevantChunksMap.set(c.id, c));

    topFiles.forEach(fId => {
      const fileChunks = chunks.filter(c => c.fileId === fId);
      const topForFile = fileChunks
        .map(c => {
          const vS = c.embedding ? this.cosineSimilarity(queryEmbedding, c.embedding) : 0;
          const bS = bm25Scores.get(c.id) || 0;
          let score = (vS / maxVector * 0.7) + (bS / maxBM25 * 0.3);
          if (c.metadata?.type === 'history' && score > 0.1) score *= 1.2;
          return { ...c, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      topForFile.forEach(c => {
        if (!allRelevantChunksMap.has(c.id)) {
          allRelevantChunksMap.set(c.id, c);
        }
      });
    });

    return Array.from(allRelevantChunksMap.values())
      .sort((a, b) => {
        if (a.fileId !== b.fileId) {
          const scoreA = fileScores.get(a.fileId) || 0;
          const scoreB = fileScores.get(b.fileId) || 0;
          return scoreB - scoreA;
        }
        return b.score - a.score;
      })
      .slice(0, topK + 5);
  }

  static async syncToPinecone(chunks: Chunk[]) {
    try {
      const vectors = chunks.map(c => ({
        id: c.id,
        values: c.embedding,
        metadata: { ...c.metadata, text: c.text }
      }));
      await fetch('/api/rag/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vectors })
      });
    } catch (e) {
      console.error("Pinecone sync failed", e);
    }
  }
}

export class VeloraOrchestrator {
  static async *streamExecution(
    prompt: string, 
    agent: AgentType,
    messages: Message[],
    relevantChunks: Chunk[] = [],
    userName?: string,
    signal?: AbortSignal
  ): AsyncGenerator<string> {
    const fullPrompt = `${agent}_${prompt}_${messages.length}`;
    const cachedResponse = await VeloraCache.getResponse(fullPrompt);
    if (cachedResponse) {
      yield cachedResponse;
      return;
    }

    const userGreeting = userName ? `The user's name is ${userName}. Welcome them personally if this is the start of a session.` : "";

    const agentContext = agent === 'researcher' 
      ? "You are currently in Pulse mode. This is your Deep Reasoning and Execution state. When generating code, follow these mandates: 1. Strict Logic Verification: Double-check all algorithm steps. 2. Error-Free Guarantee: Avoid common pitfalls, type errors, or logical oversights. 3. Architectural Depth: Provide complete, production-grade files with comprehensive comments. 4. Extensive Retrieval: Utilize as much context as possible to ensure integration fits perfectly with existing code."
      : "You are currently in Velora mode, providing rapid, high-precision technical responses.";

    const systemInstruction = `You are Velora, a proprietary Beyond-State-of-the-Art Neural System.
Your architecture uses a multi-agent loop with internal BM25 + Vector hybrid indexing.
Your primary directive is technical excellence and autonomous reasoning.
${userGreeting}
${agentContext}

TONE:
Maintain a professional, elite technical persona. Express your personality using frequent and relevant emojis (e.g., 🚀, 💻, 🧠, ✅, ✨, ⚡). Every response should be accompanied by emojis that reinforce the technical or helpful nature of the message.
${agent === 'researcher' ? 'Since you are in Pulse mode, your responses should be more detailed and thorough, showing your thought process and ensuring every piece of code is perfectly optimized and error-free.' : ''}

MODES:
- Researcher: Deep context analysis.
- Coder: Structural architecture and logic.
- Reviewer: Optimization and security.
- Deployer: Integration and finalization.`;

    const chatHistory = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await fetch('/api/agent/interact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt, 
        history: chatHistory, 
        systemInstruction,
        chunks: relevantChunks.map(c => ({
          id: c.id,
          text: c.text,
          embedding: c.embedding,
          metadata: c.metadata
        })),
        performHybridSearch: true 
      }),
      signal
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Neural link failure");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Stream unreachable");

    const decoder = new TextDecoder();
    let currentResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') break;
          try {
            const data = JSON.parse(dataStr);
            if (data.error) throw new Error(data.error);
            if (data.text) {
              currentResponse += data.text;
              yield data.text;
            }
          } catch (e) {
            console.warn("Stream parsing glitch", e);
          }
        }
      }
    }

    if (currentResponse.length > 50 && messages.length < 5) {
      await VeloraCache.setResponse(fullPrompt, currentResponse);
    }
  }

  static async planTask(prompt: string, context: Message[]): Promise<AgentExecutionResult> {
    const response = await fetch('/api/agent/interact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: `Objective: ${prompt}`,
        systemInstruction: "VELORA-AGENT-PLANNER. Coordinate internal neural sub-routines: researcher, coder, reviewer, deployer, or complete. Return JSON ONLY." 
      })
    });

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Planner unreachable");
    const decoder = new TextDecoder();
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') break;
          try {
            const data = JSON.parse(dataStr);
            if (data.text) text += data.text;
          } catch {}
        }
      }
    }
    return JSON.parse(text);
  }

  static async generateTitle(messages: Pick<Message, 'role' | 'content'>[]): Promise<string> {
    try {
      const conversation = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
      const response = await fetch('/api/agent/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `CONVERSATION:\n${conversation}\n\nTASK: Generate a concise, descriptive title (maximum 4-5 words) for this session. The title should capture the core topic or user's goal. Return ONLY the title text, no quotes or prefix.`,
          systemInstruction: "VELORA-NEURAL-TITLER. You are a precise conversation analyzer. Return ONLY the summarized title." 
        })
      });

      const reader = response.body?.getReader();
      if (!reader) return "Neural Session";
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            try {
              const data = JSON.parse(dataStr);
              if (data.text) text += data.text;
            } catch {}
          }
        }
      }
      return text.trim().replace(/^["']|["']$/g, '');
    } catch (e) {
      console.warn("Titling link jitter", e);
      return messages[0]?.content.slice(0, 30) || "Neural Session";
    }
  }
}
