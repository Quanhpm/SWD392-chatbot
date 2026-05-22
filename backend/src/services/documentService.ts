import fs from 'node:fs/promises';
import path from 'node:path';

import { Types } from 'mongoose';

import { env } from '../config/environment.js';
import { ChunkModel } from '../models/Chunk.js';
import { DocumentModel, type IDocument } from '../models/Document.js';
import type { FileType } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { chunkText } from './chunkingService.js';
import { generateEmbeddings } from './embeddingService.js';
import { parseDocument } from './documentParserService.js';

export interface CreateDocumentInput {
  fileName: string;
  originalName: string;
  fileType: FileType;
  fileSize: number;
  mimeType: string;
  subject: string;
  chapter: number;
  chapterTitle: string;
}

const filePathForDocument = (document: IDocument): string => path.resolve(env.uploadDir, document.fileName);

const deleteFileIfExists = async (filePath: string): Promise<void> => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') {
      logger.warn(`Could not delete temp file ${filePath}: ${nodeError.message}`);
    }
  }
};

/** Creates a document record for an uploaded source. */
export const createDocument = async (input: CreateDocumentInput): Promise<IDocument & { _id: Types.ObjectId }> => {
  const document = await DocumentModel.create({
    ...input,
    status: 'uploaded',
    totalChunks: 0,
  });

  return document.toObject() as IDocument & { _id: Types.ObjectId };
};

/** Lists documents with optional subject/status filters. */
export const listDocuments = async (filters: { subject?: string; status?: string }): Promise<IDocument[]> => {
  const query: Partial<Pick<IDocument, 'subject' | 'status'>> = {};
  if (filters.subject) {
    query.subject = filters.subject;
  }
  if (filters.status && ['uploaded', 'processing', 'indexed', 'failed'].includes(filters.status)) {
    query.status = filters.status as IDocument['status'];
  }

  return DocumentModel.find(query).sort({ uploadedAt: -1 }).lean().exec();
};

/** Returns a single document by id. */
export const getDocumentById = async (id: string): Promise<IDocument & { _id: Types.ObjectId }> => {
  const document = await DocumentModel.findById(id).lean().exec();
  if (!document) {
    throw new AppError('Document not found', 404);
  }
  return document as IDocument & { _id: Types.ObjectId };
};

/** Deletes a document, associated chunks, and any leftover upload file. */
export const deleteDocument = async (id: string): Promise<number> => {
  const document = await DocumentModel.findById(id).exec();
  if (!document) {
    throw new AppError('Document not found', 404);
  }

  const deleteResult = await ChunkModel.deleteMany({ documentId: document._id }).exec();
  await deleteFileIfExists(filePathForDocument(document));
  await document.deleteOne();
  return deleteResult.deletedCount;
};

/** Runs parse -> chunk -> embed -> index for one uploaded document. */
export const processDocument = async (documentId: string): Promise<void> => {
  const document = await DocumentModel.findById(documentId).exec();
  if (!document) {
    throw new AppError('Document not found', 404);
  }

  const filePath = filePathForDocument(document);

  try {
    document.status = 'processing';
    document.processedAt = new Date();
    document.errorMessage = undefined;
    await document.save();

    const parseResult = await parseDocument(filePath, document.fileType);
    const chunks = chunkText(parseResult.text);
    if (chunks.length === 0) {
      throw new Error('No indexable text could be extracted from the document.');
    }

    const embeddings = await generateEmbeddings(chunks.map((chunk) => chunk.content));
    await ChunkModel.deleteMany({ documentId: document._id }).exec();
    await ChunkModel.insertMany(
      chunks.map((chunk, index) => ({
        documentId: document._id,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        pageNumbers: chunk.pageNumbers,
        startChar: chunk.startChar,
        endChar: chunk.endChar,
        tokenCount: chunk.tokenCount,
        embedding: embeddings[index] ?? [],
        metadata: {
          subject: document.subject,
          chapter: document.chapter,
          chapterTitle: document.chapterTitle,
          fileName: document.originalName,
        },
      })),
    );

    document.status = 'indexed';
    document.totalChunks = chunks.length;
    document.totalPages = parseResult.pageCount;
    document.indexedAt = new Date();
    await document.save();
    logger.info(`Indexed ${document.originalName} with ${chunks.length} chunks`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown document processing error';
    document.status = 'failed';
    document.errorMessage = message;
    await document.save();
    logger.error(`Document processing failed for ${document.originalName}: ${message}`);
  } finally {
    await deleteFileIfExists(filePath);
  }
};
