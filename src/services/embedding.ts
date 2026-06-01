interface EmbeddingResult {
  text: string;
  embedding: number[];
}

let documentVectors: number[][] = [];
const vocabulary: Map<string, number> = new Map();
const documentFrequency: Map<string, number> = new Map();
let initialized = false;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function buildVocabulary(texts: string[]): void {
  vocabulary.clear();
  documentFrequency.clear();

  let vocabIndex = 0;
  const seenInDoc = new Set<string>();

  for (const text of texts) {
    const tokens = tokenize(text);
    seenInDoc.clear();

    for (const token of tokens) {
      if (!vocabulary.has(token)) {
        vocabulary.set(token, vocabIndex++);
      }

      if (!seenInDoc.has(token)) {
        seenInDoc.add(token);
        documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
      }
    }
  }

  initialized = true;
}

function computeTFIDF(text: string, totalDocs: number): number[] {
  const vector = new Array(vocabulary.size).fill(0);
  const tokens = tokenize(text);

  // Calculate term frequency
  const termFreq = new Map<string, number>();
  for (const token of tokens) {
    termFreq.set(token, (termFreq.get(token) || 0) + 1);
  }

  // Apply TF-IDF formula
  for (const [token, freq] of termFreq.entries()) {
    const vocabIndex = vocabulary.get(token);
    if (vocabIndex === undefined) continue;

    const tf = freq / tokens.length;
    const docFreq = documentFrequency.get(token) || 1;
    const idf = Math.log(totalDocs / docFreq);
    vector[vocabIndex] = tf * idf;
  }

  return vector;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!initialized) {
    buildVocabulary([text]);
  }
  return computeTFIDF(text, Math.max(1, documentVectors.length));
}

export async function generateEmbeddings(
  texts: string[],
): Promise<EmbeddingResult[]> {
  buildVocabulary(texts);

  documentVectors = texts.map((text) => computeTFIDF(text, texts.length));

  return texts.map((text, index) => ({
    text,
    embedding: documentVectors[index],
  }));
}

export function cosineSimilarity(a: number[], b: number[]): number {
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
