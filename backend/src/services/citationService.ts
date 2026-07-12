import { Types } from 'mongoose';
import type { ICitation } from '../models/ChatSession.js';
import type { RetrievalResult } from '../types/index.js';

const preview = (content: string): string => {
  const compact = content.replace(/\s+/g, ' ').trim();
  return compact.length > 150 ? `${compact.slice(0, 150)}...` : compact;
};

/** Builds structured citations from retrieved chunks. */
export const buildCitations = (retrievalResults: RetrievalResult[], subjectId: string | Types.ObjectId): ICitation[] =>
  retrievalResults
    .map((result) => ({
      subjectId: new Types.ObjectId(subjectId),
      documentId: result.chunk.documentId,
      fileName: result.chunk.metadata.fileName,
      subject: result.chunk.metadata.subject,
      chapter: result.chunk.metadata.chapter,
      chapterTitle: result.chunk.metadata.chapterTitle,
      pageNumbers: result.chunk.pageNumbers,
      chunkIndex: result.chunk.chunkIndex,
      similarityScore: Number(result.similarityScore.toFixed(4)),
      snippetPreview: preview(result.chunk.content),
    }));
