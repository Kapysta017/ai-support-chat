import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export interface Chunk {
  id: string;
  content: string;
  source: string;
  metadata: {
    chunkIndex: number;
    totalChunks: number;
    sourceFile: string;
  };
}

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
  separators: ["\n\n", "\n", " ", ""],
});

export async function chunkDocuments(
  documents: { content: string; source: string }[],
): Promise<Chunk[]> {
  const chunks: Chunk[] = [];
  let globalChunkId = 0;

  for (const doc of documents) {
    const texts = await textSplitter.splitText(doc.content);

    texts.forEach((text, index) => {
      chunks.push({
        id: `chunk-${globalChunkId++}`,
        content: text,
        source: doc.source,
        metadata: {
          chunkIndex: index,
          totalChunks: texts.length,
          sourceFile: doc.source,
        },
      });
    });
  }

  return chunks;
}
