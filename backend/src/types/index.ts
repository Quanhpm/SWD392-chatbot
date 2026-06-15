import type { Types } from 'mongoose';

import type { IChunk } from '../models/Chunk.js';

export type FileType = 'pdf' | 'docx' | 'pptx';
export type DocumentStatus = 'uploaded' | 'processing' | 'pending' | 'approved' | 'rejected' | 'failed';
export type UserRole = 'admin' | 'teacher' | 'student';

export interface PageText {
  pageNumber: number;
  text: string;
}

export interface ParseResult {
  text: string;
  pageCount?: number;
  pages?: PageText[];
}

export interface ChunkResult {
  content: string;
  chunkIndex: number;
  pageNumbers: number[];
  startChar: number;
  endChar: number;
  tokenCount: number;
}

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export type StoredChunk = IChunk & { _id: Types.ObjectId };

export interface RetrievalResult {
  chunk: StoredChunk;
  similarityScore: number;
}

export interface ChatResponse {
  content: string;
  citations: Array<{
    documentId: Types.ObjectId;
    fileName: string;
    subject: string;
    chapter: number;
    chapterTitle: string;
    pageNumbers: number[];
    chunkIndex: number;
    similarityScore: number;
    snippetPreview: string;
  }>;
}

export interface ChatResponseWithQuota extends ChatResponse {
  quotaStatus?: {
    allowed: boolean;
    used: number;
    limit: number;
    planName: string;
    remaining: number;
  };
}
