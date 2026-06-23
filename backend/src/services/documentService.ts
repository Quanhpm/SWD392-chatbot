import fs from 'node:fs/promises';
import path from 'node:path';
import { Types } from 'mongoose';

import { env } from '../config/environment.js';
import { ChunkModel } from '../models/Chunk.js';
import { ChatSessionModel } from '../models/ChatSession.js';
import { DocumentModel, type IDocument } from '../models/Document.js';
import type { FileType } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { chunkText } from './chunkingService.js';
import type { IParserPort } from '../ports/IParserPort.js';
import type { IEmbeddingPort } from '../ports/IEmbeddingPort.js';

export interface CreateDocumentInput {
  fileName: string;
  originalName: string;
  fileType: FileType;
  fileSize: number;
  mimeType: string;
  subjectId: string;
  subject: string;
  chapter: number;
  chapterTitle: string;
  uploadedBy: string;
}

const filePathForDocument = (document: IDocument): string => path.resolve(env.uploadDir, document.fileName);

const deleteFileIfExists = async (filePath: string): Promise<void> => {
  try { await fs.unlink(filePath); }
  catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') logger.warn(`Could not delete file ${filePath}: ${nodeError.message}`);
  }
};

export class DocumentService {
  constructor(private parser: IParserPort, private embeddingPort: IEmbeddingPort) {}

  async createDocument(input: CreateDocumentInput): Promise<IDocument & { _id: Types.ObjectId }> {
    const document = await DocumentModel.create({ ...input, status: 'uploaded', totalChunks: 0 });
    return document.toObject() as IDocument & { _id: Types.ObjectId };
  }

  async listDocuments(filters: {
    subject?: string;
    status?: string;
    uploadedByFilter?: string;
    userRole: 'admin' | 'teacher' | 'student';
    userId: string;
    accessibleSubjectIds: string[];
  }): Promise<IDocument[]> {
    const query: Record<string, unknown> = {};
    if (filters.userRole === 'student') {
      query.status = 'ready';
      query.subjectId = { $in: filters.accessibleSubjectIds };
    } else if (filters.userRole === 'teacher') {
      query.subjectId = { $in: filters.accessibleSubjectIds };
      query.$or = [{ status: 'ready' }, { uploadedBy: filters.userId }];
    }
    if (filters.subject) query.subject = filters.subject;
    if (filters.userRole !== 'student' && filters.status && ['uploaded', 'processing', 'ready', 'failed'].includes(filters.status)) {
      query.status = filters.status;
    }
    if (filters.userRole === 'admin' && filters.uploadedByFilter) query.uploadedBy = filters.uploadedByFilter;

    return DocumentModel.find(query)
      .populate('uploadedBy', 'username fullName userCode')
      .sort({ uploadedAt: -1 })
      .lean()
      .exec() as unknown as Promise<IDocument[]>;
  }

  async getDocumentById(id: string): Promise<IDocument & { _id: Types.ObjectId }> {
    const document = await DocumentModel.findById(id).lean().exec();
    if (!document) throw new AppError('Document not found.', 404);
    return document as IDocument & { _id: Types.ObjectId };
  }

  async updateMetadata(id: string, input: { originalName?: string; chapter?: number; chapterTitle?: string }): Promise<IDocument> {
    const document = await DocumentModel.findById(id).exec();
    if (!document) throw new AppError('Document not found.', 404);
    if (input.originalName !== undefined) document.originalName = input.originalName.trim();
    if (input.chapter !== undefined) document.chapter = input.chapter;
    if (input.chapterTitle !== undefined) document.chapterTitle = input.chapterTitle.trim();
    await document.save();
    await ChunkModel.updateMany(
      { documentId: document._id },
      { $set: {
        'metadata.chapter': document.chapter,
        'metadata.chapterTitle': document.chapterTitle,
        'metadata.fileName': document.originalName,
      } },
    ).exec();
    return document.toObject();
  }

  async deleteDocument(id: string): Promise<number> {
    const document = await DocumentModel.findById(id).exec();
    if (!document) throw new AppError('Document not found.', 404);
    const [deleteResult] = await Promise.all([
      ChunkModel.deleteMany({ documentId: document._id }).exec(),
      ChatSessionModel.deleteMany({ documentId: document._id }).exec(),
    ]);
    await deleteFileIfExists(filePathForDocument(document));
    await document.deleteOne();
    return deleteResult.deletedCount;
  }

  async queueProcessing(documentId: string): Promise<void> {
    const document = await this.lockDocumentForProcessing(documentId);
    void this.processLockedDocument(document).catch((error) => {
      logger.error(`Document processing failed after queueing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });
  }

  async processDocument(documentId: string): Promise<void> {
    const document = await this.lockDocumentForProcessing(documentId);
    await this.processLockedDocument(document);
  }

  private async lockDocumentForProcessing(documentId: string): Promise<IDocument & { _id: Types.ObjectId; save: () => Promise<unknown> }> {
    const document = await DocumentModel.findOneAndUpdate(
      { _id: documentId, status: { $in: ['uploaded', 'failed'] } },
      {
        $set: { status: 'processing', processedAt: new Date(), totalChunks: 0 },
        $unset: { errorMessage: 1 },
      },
      { new: true },
    ).exec();
    if (document) return document as unknown as IDocument & { _id: Types.ObjectId; save: () => Promise<unknown> };

    const current = await DocumentModel.findById(documentId).lean().exec();
    if (!current) throw new AppError('Document not found.', 404);
    if (current.status === 'processing') throw new AppError('Document is already processing.', 409);
    throw new AppError('Only uploaded or failed documents can be processed.', 400);
  }

  private async processLockedDocument(document: IDocument & { _id: Types.ObjectId; save: () => Promise<unknown> }): Promise<void> {
    const filePath = filePathForDocument(document);
    try {
      const parseResult = await this.parser.parse(filePath, document.fileType);
      const chunks = chunkText(parseResult.text);
      if (chunks.length === 0) throw new Error('No indexable text could be extracted from the document.');
      const embeddings = await this.embeddingPort.generateEmbeddings(chunks.map((chunk) => chunk.content));
      await ChunkModel.deleteMany({ documentId: document._id }).exec();
      await ChunkModel.insertMany(chunks.map((chunk, index) => ({
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
      })));
      document.status = 'ready';
      document.totalChunks = chunks.length;
      document.totalPages = parseResult.pageCount;
      document.indexedAt = new Date();
      await document.save();
      logger.info(`Processed ${document.originalName} with ${chunks.length} chunks; document is ready`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown document processing error';
      document.status = 'failed';
      document.errorMessage = message;
      await document.save();
      logger.error(`Document processing failed for ${document.originalName}: ${message}`);
    }
  }
}
