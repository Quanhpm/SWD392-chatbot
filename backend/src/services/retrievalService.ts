import { env } from '../config/environment.js';
import { ChunkModel } from '../models/Chunk.js';
import type { RetrievalResult, StoredChunk } from '../types/index.js';
import { cosineSimilarity } from '../utils/cosineSimilarity.js';

/** Retrieves top matching chunks with MongoDB M0-compatible in-process cosine search. */
export const retrieveRelevantChunks = async (
  queryEmbedding: number[],
  topK = env.topK,
  similarityThreshold = env.similarityThreshold,
): Promise<RetrievalResult[]> => {
  const chunks = await ChunkModel.find().exec();

  return chunks
    .map((chunk) => ({
      chunk: chunk.toObject() as StoredChunk,
      similarityScore: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .filter((result) => result.similarityScore >= similarityThreshold)
    .sort((first, second) => second.similarityScore - first.similarityScore)
    .slice(0, topK);
};
