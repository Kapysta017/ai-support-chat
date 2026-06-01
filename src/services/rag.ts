import { chunkDocuments } from "./chunking";
import { generateEmbedding, generateEmbeddings } from "./embedding";
import {
  addChunksToVectorStore,
  queryVectorStore,
  initVectorStore,
  getVectorStoreStatus,
} from "./vectorStore";

export interface RAGDocument {
  content: string;
  source: string;
}

export interface RetrievedContext {
  text: string;
  source: string;
  similarity: number;
}

export class RAGService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log("Initializing RAG Service...");
    await initVectorStore();
    this.initialized = true;
    console.log("RAG Service initialized");
  }

  async indexDocuments(documents: RAGDocument[]): Promise<void> {
    await this.initialize();

    console.log(`Indexing ${documents.length} documents...`);

    const chunks = await chunkDocuments(documents);
    console.log(`Created ${chunks.length} chunks`);

    console.log("Generating embeddings...");
    const embeddings = await generateEmbeddings(chunks.map((c) => c.content));
    const embeddingVectors = embeddings.map((e) => e.embedding);

    // Step 3: Store in vector database
    await addChunksToVectorStore(chunks, embeddingVectors);
    console.log("Indexing complete");
  }

  async retrieveContext(
    query: string,
    topK: number = 5,
  ): Promise<RetrievedContext[]> {
    await this.initialize();

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Search vector store
    const results = await queryVectorStore(queryEmbedding, topK);

    // Filter by similarity threshold and format results
    return results
      .filter((r) => r.similarity > 0.3) // Only include reasonably similar results
      .map((r) => ({
        text: r.text,
        source: r.source,
        similarity: r.similarity,
      }));
  }

  async getStatus(): Promise<{
    initialized: boolean;
    documentCount: number;
  }> {
    return await getVectorStoreStatus();
  }
}

// Singleton instance
export const ragService = new RAGService();
