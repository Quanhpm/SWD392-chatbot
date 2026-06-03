import fs from 'node:fs/promises';
import path from 'node:path';

import { Types } from 'mongoose';

import { env } from '../config/environment.js';
import { ChunkModel } from '../models/Chunk.js';
import { ChatSessionModel } from '../models/ChatSession.js';
import { DocumentModel, type IDocument } from '../models/Document.js';
import { DocumentAssistModel, type IDocumentAssist } from '../models/DocumentAssist.js';
import { QuestionQuotaModel } from '../models/QuestionQuota.js';
import type { ILLMPort } from '../ports/ILLMPort.js';
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
  uploadedBy: string; // userId of the teacher
}

const filePathForDocument = (document: IDocument): string =>
  path.resolve(env.uploadDir, document.fileName);

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

export class DocumentService {
  constructor(
    private parser: IParserPort,
    private embeddingPort: IEmbeddingPort,
    private llmPort: ILLMPort,
  ) {}

  /** Creates a document record for an uploaded source. */
  async createDocument(input: CreateDocumentInput): Promise<IDocument & { _id: Types.ObjectId }> {
    const document = await DocumentModel.create({
      ...input,
      status: 'uploaded',
      totalChunks: 0,
    });

    return document.toObject() as IDocument & { _id: Types.ObjectId };
  }

  /**
   * Lists documents with role-based access control:
   * - Teacher: sees own uploaded documents (optionally filtered by subject/status)
   * - Student: sees only documents from enrolled subjects
   *   - With ?subject filter: 403 if not enrolled in that subject
   *   - Without ?subject filter: auto-filters to enrolled subjects only
   */
  async listDocuments(filters: {
    subject?: string;
    status?: string;
    userRole?: 'teacher' | 'student';
    uploadedBy?: string;
    enrolledSubjectIds?: string[];
    enrolledSubjectNames?: string[];
  }): Promise<IDocument[]> {
    const query: Record<string, unknown> = {};

    if (filters.userRole === 'teacher' && filters.uploadedBy) {
      query.uploadedBy = filters.uploadedBy;
    }

    if (filters.subject) {
      if (
        filters.userRole === 'student' &&
        filters.enrolledSubjectNames !== undefined &&
        !filters.enrolledSubjectNames.includes(filters.subject)
      ) {
        throw new AppError('Access denied. You are not enrolled in this subject.', 403);
      }
      query.subject = filters.subject;
    } else if (
      filters.userRole === 'student' &&
      filters.enrolledSubjectIds !== undefined &&
      filters.enrolledSubjectNames !== undefined
    ) {
      // Auto-filter to enrolled subjects only (empty array → no results)
      query.$or = [
        { subjectId: { $in: filters.enrolledSubjectIds } },
        { subject: { $in: filters.enrolledSubjectNames } },
      ];
    }

    if (
      filters.status &&
      ['uploaded', 'processing', 'indexed', 'failed'].includes(filters.status)
    ) {
      query.status = filters.status;
    }

    return DocumentModel.find(query).sort({ uploadedAt: -1 }).lean().exec();
  }

  /** Returns a single document by id. */
  async getDocumentById(id: string): Promise<IDocument & { _id: Types.ObjectId }> {
    const document = await DocumentModel.findById(id).lean().exec();
    if (!document) {
      throw new AppError('Document not found', 404);
    }
    return document as IDocument & { _id: Types.ObjectId };
  }

  /** Deletes a document, associated chunks, and any leftover upload file. */
  async deleteDocument(id: string, actor?: { role: 'teacher' | 'student'; userId: string }): Promise<number> {
    const document = await DocumentModel.findById(id).exec();
    if (!document) {
      throw new AppError('Document not found', 404);
    }
    if (actor?.role === 'teacher' && document.uploadedBy.toString() !== actor.userId) {
      throw new AppError('Access denied. You can only delete documents you uploaded.', 403);
    }

    const [deleteResult] = await Promise.all([
      ChunkModel.deleteMany({ documentId: document._id }).exec(),
      DocumentAssistModel.deleteOne({ documentId: document._id }).exec(),
      ChatSessionModel.deleteMany({ documentId: document._id }).exec(),
      QuestionQuotaModel.deleteMany({ documentId: document._id }).exec(),
    ]);
    await deleteFileIfExists(filePathForDocument(document));
    await document.deleteOne();
    return deleteResult.deletedCount;
  }

  /** Runs parse → chunk → embed → index for one uploaded document. */
  async processDocument(documentId: string): Promise<void> {
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

      const parseResult = await this.parser.parse(filePath, document.fileType);
      const chunks = chunkText(parseResult.text);
      if (chunks.length === 0) {
        throw new Error('No indexable text could be extracted from the document.');
      }

      const embeddings = await this.embeddingPort.generateEmbeddings(
        chunks.map((chunk) => chunk.content),
      );
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
      // Keep physical file for PDF nhúng previewer
      // await deleteFileIfExists(filePath);
    }
  }

  /** Returns cached DocumentAssist data if present. */
  async getDocumentAssist(documentId: string): Promise<IDocumentAssist | null> {
    return DocumentAssistModel.findOne({ documentId: new Types.ObjectId(documentId) })
      .lean()
      .exec();
  }

  /** Generates document summary (takeaways) and interactive flashcards via Gemini API and caches it. */
  async generateDocumentAssist(documentId: string): Promise<IDocumentAssist> {
    const document = await this.getDocumentById(documentId);
    
    // Fetch all text chunks
    const chunks = await ChunkModel.find({ documentId: document._id })
      .sort({ chunkIndex: 1 })
      .select('content')
      .lean()
      .exec();

    if (chunks.length === 0) {
      throw new AppError('No document text chunks available to generate study guides.', 400);
    }

    const documentText = chunks.map((c) => c.content).join('\n\n');

    // Call Gemini API to extract takeaways & flashcards
    const geminiChat = this.llmPort;
    const systemPrompt = `You are a premium AI Study Assistant. Analyze the provided text and return a JSON structure matching the study guide rules.
Keep definitions and flashcard answers extremely clear, engaging, yet highly concise (maximum 2-3 sentences per description or answer) to avoid any truncation.
The JSON must strictly conform to this TypeScript schema:
{
  "takeaways": [
    {
      "concept": "Concise concept name in Vietnamese (max 4 words, e.g. 'Mô hình hóa', 'UML Sequence')",
      "desc": "Summary explanation of the concept in Vietnamese (1-2 sentences)",
      "icon": "One standard Material Symbols Outlined icon name suitable for the card (e.g. 'schema', 'insights', 'widgets', 'hexagon', 'style', 'school', 'psychology', 'account_circle', 'settings', 'database', 'code', 'menu_book')",
      "color": "A vibrant high-contrast aesthetic hexadecimal color code (e.g. '#0047AB', '#7B1FA2', '#C2185B', '#2E7D32', '#E65100', '#1565C0')"
    }
  ], // exactly 3 key concept takeaways
  "flashcards": [
    {
      "question": "A concise question reviewing the concepts in Vietnamese",
      "answer": "A clear, detailed, and helpful answer in Vietnamese"
    }
  ] // exactly 4 flashcards
}
Respond with ONLY valid, raw, parseable JSON. Do not include markdown code block syntax (like \`\`\`json) or any extra conversational text.`;

    const responseText = await geminiChat.callLLM(
      systemPrompt,
      [],
      `Here is the document content to analyze:\n\n${documentText.slice(0, 15000)}`
    );

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const cleanedJSONText = jsonMatch ? jsonMatch[0].trim() : responseText.trim();

      const parsedData = JSON.parse(cleanedJSONText) as {
        takeaways: { concept: string; desc: string; icon: string; color: string }[];
        flashcards: { question: string; answer: string }[];
      };

      if (!parsedData.takeaways || !parsedData.flashcards) {
        throw new Error('Invalid JSON structure returned by Gemini.');
      }

      // Upsert DocumentAssist record
      const assist = await DocumentAssistModel.findOneAndUpdate(
        { documentId: document._id },
        {
          documentId: document._id,
          takeaways: parsedData.takeaways,
          flashcards: parsedData.flashcards,
        },
        { upsert: true, new: true }
      ).exec();

      return assist.toObject() as IDocumentAssist;
    } catch (parseError) {
      logger.error(`Failed to parse Gemini JSON output for study guide: ${parseError}`);
      logger.info(`Raw LLM Response: ${responseText}`);
      throw new AppError('AI failed to generate parseable study guides. Please try again.', 502);
    }
  }
}
