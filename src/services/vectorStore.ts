import type { Chunk } from "./chunking";

export interface StoredVector {
  id: string;
  text: string;
  vector: number[];
  source: string;
  metadata: Record<string, unknown>;
}

// In-memory vector store with IndexedDB persistence
class VectorStore {
  private vectors: Map<string, StoredVector> = new Map();
  private dbName = "rag-vector-store";
  private storeName = "vectors";
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.loadFromIndexedDB().then(resolve);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };
    });
  }

  private async loadFromIndexedDB(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const vectors = request.result as StoredVector[];
        vectors.forEach((v) => this.vectors.set(v.id, v));
        console.log(`Loaded ${vectors.length} vectors from IndexedDB`);
        resolve();
      };

      request.onerror = () => {
        console.warn("Failed to load vectors from IndexedDB");
        resolve();
      };
    });
  }

  private async saveToIndexedDB(vector: StoredVector): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(vector);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async addVector(vector: StoredVector): Promise<void> {
    this.vectors.set(vector.id, vector);
    await this.saveToIndexedDB(vector);
  }

  async addVectors(vectors: StoredVector[]): Promise<void> {
    for (const vector of vectors) {
      await this.addVector(vector);
    }
  }

  searchSimilar(
    queryVector: number[],
    limit: number = 5,
  ): (StoredVector & { similarity: number })[] {
    const results: (StoredVector & { similarity: number })[] = [];

    for (const vector of this.vectors.values()) {
      const similarity = cosineSimilarity(queryVector, vector.vector);
      results.push({
        ...vector,
        similarity,
      });
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  async clear(): Promise<void> {
    this.vectors.clear();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  getCount(): number {
    return this.vectors.size;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const minLength = Math.min(a.length, b.length);

  for (let i = 0; i < minLength; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

// Singleton instance
const vectorStore = new VectorStore();

export async function initVectorStore(): Promise<void> {
  console.log("Initializing vector store...");
  await vectorStore.initialize();
  console.log("Vector store ready");
}

export async function addChunksToVectorStore(
  chunks: Chunk[],
  embeddings: number[][],
): Promise<void> {
  const vectors: StoredVector[] = chunks.map((chunk, index) => ({
    id: chunk.id,
    text: chunk.content,
    vector: embeddings[index],
    source: chunk.source,
    metadata: chunk.metadata,
  }));

  await vectorStore.addVectors(vectors);
  console.log(`Added ${vectors.length} chunks to vector store`);
}

export async function queryVectorStore(
  queryVector: number[],
  limit: number = 5,
): Promise<(StoredVector & { similarity: number })[]> {
  return vectorStore.searchSimilar(queryVector, limit);
}

export async function getVectorStoreStatus(): Promise<{
  initialized: boolean;
  documentCount: number;
}> {
  return {
    initialized: true,
    documentCount: vectorStore.getCount(),
  };
}

export async function clearVectorStore(): Promise<void> {
  await vectorStore.clear();
  console.log("Vector store cleared");
}
