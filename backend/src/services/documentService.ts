import fs from 'node:fs/promises';
import path from 'node:path';

import { Types } from 'mongoose';

import { env } from '../config/environment.js';
import { ChunkModel } from '../models/Chunk.js';
import { CourseClassModel } from '../models/CourseClass.js';
import { UserModel } from '../models/User.js';
import { ChatSessionModel } from '../models/ChatSession.js';
import { DocumentModel, type IDocument } from '../models/Document.js';
import { DocumentAssistModel, type IDocumentAssist } from '../models/DocumentAssist.js';
import type { ILLMPort } from '../ports/ILLMPort.js';
import type { FileType } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { chunkText } from './chunkingService.js';
import type { IParserPort } from '../ports/IParserPort.js';
import type { IEmbeddingPort } from '../ports/IEmbeddingPort.js';
import type { EmailService } from './emailService.js';

export interface CreateDocumentInput {
  fileName: string;
  originalName: string;
  fileType: FileType;
  fileSize: number;
  mimeType: string;
  subjectId: string;
  subject: string;
  visibility: IDocument['visibility'];
  classIds: Types.ObjectId[];
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
    private emailService: EmailService,
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

  async listDocuments(filters: {
    subject?: string;
    status?: string;
    uploadedByFilter?: string;
    userRole: 'admin' | 'teacher' | 'student';
    userId: string;
    accessibleSubjectIds: string[];
    accessibleClassIds: string[];
    uploadedBy?: string;
  }): Promise<IDocument[]> {
    const query: Record<string, unknown> = {};

    if (filters.userRole === 'student') {
      query.status = 'approved';
      query.subjectId = { $in: filters.accessibleSubjectIds };
      query.$or = [
        { visibility: { $exists: false } },
        { visibility: 'subject-wide' },
        { visibility: 'class-restricted', classIds: { $in: filters.accessibleClassIds } },
      ];
    } else if (filters.userRole === 'teacher') {
      query.$or = [
        { uploadedBy: filters.userId },
        {
          subjectId: { $in: filters.accessibleSubjectIds },
          status: 'approved',
          $or: [
            { visibility: { $exists: false } },
            { visibility: 'subject-wide' },
            { visibility: 'class-restricted', classIds: { $in: filters.accessibleClassIds } },
          ],
        },
      ];
    }

    if (filters.subject) {
      query.subject = filters.subject;
    }

    if (
      filters.userRole !== 'student' &&
      filters.status &&
      ['uploaded', 'processing', 'pending', 'approved', 'rejected', 'failed'].includes(filters.status)
    ) {
      query.status = filters.status;
    }
    if (filters.userRole === 'admin' && filters.uploadedByFilter) {
      query.uploadedBy = filters.uploadedByFilter;
    }

    return DocumentModel.find(query)
      .populate('uploadedBy', 'username fullName userCode')
      .populate('reviewedBy', 'username fullName')
      .populate('classIds', 'code name status')
      .sort({ uploadedAt: -1 })
      .lean()
      .exec() as unknown as Promise<IDocument[]>;
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
  async deleteDocument(id: string): Promise<number> {
    const document = await DocumentModel.findById(id).exec();
    if (!document) {
      throw new AppError('Document not found', 404);
    }
    const [deleteResult] = await Promise.all([
      ChunkModel.deleteMany({ documentId: document._id }).exec(),
      DocumentAssistModel.deleteOne({ documentId: document._id }).exec(),
      ChatSessionModel.deleteMany({ documentId: document._id }).exec(),
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

      document.status = 'pending';
      document.totalChunks = chunks.length;
      document.totalPages = parseResult.pageCount;
      document.indexedAt = new Date();
      await document.save();
      logger.info(`Processed ${document.originalName} with ${chunks.length} chunks; awaiting approval`);
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

  async approveDocument(documentId: string, adminId: string): Promise<IDocument> {
    const document = await DocumentModel.findById(documentId).exec();
    if (!document) throw new AppError('Document not found.', 404);
    if (document.status !== 'pending') throw new AppError('Only pending documents can be approved.', 400);
    if (document.totalChunks <= 0) throw new AppError('Document has no processed chunks.', 400);
    if (document.visibility === 'class-restricted') {
      const activeTargetCount = await CourseClassModel.countDocuments({
        _id: { $in: document.classIds },
        subjectId: document.subjectId,
        status: 'active',
      });
      if (activeTargetCount !== document.classIds.length) {
        throw new AppError('All target classes must still be active and belong to the document subject.', 409);
      }
    }
    document.status = 'approved';
    document.reviewedBy = new Types.ObjectId(adminId);
    document.reviewedAt = new Date();
    document.rejectionReason = undefined;
    await document.save();
    await this.notifyDocumentReviewed(document, true);
    return document.toObject();
  }

  async rejectDocument(documentId: string, adminId: string, reason: string): Promise<IDocument> {
    const document = await DocumentModel.findById(documentId).exec();
    if (!document) throw new AppError('Document not found.', 404);
    if (document.status !== 'pending') throw new AppError('Only pending documents can be rejected.', 400);

    await Promise.all([
      ChunkModel.deleteMany({ documentId: document._id }).exec(),
      DocumentAssistModel.deleteOne({ documentId: document._id }).exec(),
      ChatSessionModel.deleteMany({ documentId: document._id }).exec(),
    ]);
    document.status = 'rejected';
    document.totalChunks = 0;
    document.reviewedBy = new Types.ObjectId(adminId);
    document.reviewedAt = new Date();
    document.rejectionReason = reason.trim();
    await document.save();
    await this.notifyDocumentReviewed(document, false);
    return document.toObject();
  }

  private async notifyDocumentReviewed(document: IDocument, approved: boolean): Promise<void> {
    const uploader = await UserModel.findById(document.uploadedBy).select('email fullName').lean().exec();
    if (!uploader) return;
    await this.emailService.sendDocumentReviewed(
      { email: uploader.email, fullName: uploader.fullName },
      {
        documentName: document.originalName,
        subjectName: document.subject,
        chapter: document.chapter,
        chapterTitle: document.chapterTitle,
        approved,
        reason: approved ? undefined : document.rejectionReason,
      },
    );
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
