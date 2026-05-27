import { env } from '../config/environment.js';
import { ChunkModel } from '../models/Chunk.js';
import type { RetrievalResult, StoredChunk } from '../types/index.js';
import { cosineSimilarity } from '../utils/cosineSimilarity.js';

/**
 * Retrieves top matching chunks using MongoDB M0-compatible in-process cosine similarity search.
 *
 * @param queryEmbedding - The embedding vector for the user's query
 * @param topK - Maximum number of results to return (defaults to env.topK)
 * @param similarityThreshold - Minimum cosine similarity score (defaults to env.similarityThreshold)
 * @param subjectFilter - SECURITY: When provided, restricts chunk retrieval to only chunks
 *                        where `metadata.subject` matches this value (MongoDB query-level filter).
 *                        This prevents cross-course information leaks in RAG responses.
 */
export const retrieveRelevantChunks = async (
  queryEmbedding: number[],
  topK = env.topK,
  similarityThreshold = env.similarityThreshold,
  subjectFilter?: string,
): Promise<RetrievalResult[]> => {
  // Apply MongoDB-level subject filter when provided
  const query = subjectFilter ? { 'metadata.subject': subjectFilter } : {};

  const chunks = await ChunkModel.find(query).exec();

  return chunks
    .map((chunk) => ({
      chunk: chunk.toObject() as StoredChunk,
      similarityScore: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .filter((result) => result.similarityScore >= similarityThreshold)
    .sort((first, second) => second.similarityScore - first.similarityScore)
    .slice(0, topK);
};
