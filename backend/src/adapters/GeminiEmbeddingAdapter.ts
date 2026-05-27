import { env } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import type { IEmbeddingPort } from '../ports/IEmbeddingPort.js';

const BATCH_SIZE = 20;
const MAX_RETRIES = 3;
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiEmbeddingResponse {
  embedding?: {
    values?: number[];
  };
}

const toModelPath = (model: string): string => (model.startsWith('models/') ? model : `models/${model}`);

const buildEmbeddingUrl = (): string =>
  `${GEMINI_API_BASE_URL}/${toModelPath(env.embeddingModel)}:embedContent?key=${encodeURIComponent(env.geminiApiKey)}`;

const delay = async (milliseconds: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

const withRetry = async <T>(operation: () => Promise<T>, label: string): Promise<T> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        const message = error instanceof Error ? error.message : 'Unknown Gemini error';
        throw new Error(`${label} failed after ${MAX_RETRIES} attempts: ${message}`);
      }

      await delay(1_000 * 2 ** (attempt - 1));
    }
  }

  throw new Error(`${label} failed unexpectedly.`);
};

const requestSingleEmbedding = async (text: string): Promise<number[]> => {
  const modelPath = toModelPath(env.embeddingModel);
  const response = await fetch(buildEmbeddingUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelPath,
      content: {
        parts: [{ text }],
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Gemini embedding error (${response.status}): ${details}`);
  }

  const data = (await response.json()) as GeminiEmbeddingResponse;
  const embedding = data.embedding?.values ?? [];

  if (embedding.length === 0) {
    throw new Error('Gemini returned an invalid embedding response.');
  }

  return embedding;
};

const requestEmbeddingBatch = async (batch: string[]): Promise<number[][]> => {
  const embeddings: number[][] = [];
  for (const text of batch) {
    embeddings.push(await requestSingleEmbedding(text));
  }
  return embeddings;
};

export class GeminiEmbeddingAdapter implements IEmbeddingPort {
  async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text]);
    const embedding = embeddings[0];
    if (!embedding) {
      throw new Error('Gemini did not return an embedding.');
    }
    return embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    const totalBatches = Math.ceil(texts.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex += 1) {
      const batch = texts.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);
      const response = await withRetry(
        async () => requestEmbeddingBatch(batch),
        `Embedding batch ${batchIndex + 1}/${totalBatches}`,
      );

      embeddings.push(...response);
      logger.info(`Embedded batch ${batchIndex + 1}/${totalBatches}, ${batch.length} chunks`);
    }

    return embeddings;
  }
}
