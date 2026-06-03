import path from 'node:path';
import fs from 'node:fs';
import { env } from '../config/environment.js';

import { Router, type NextFunction, type Request, type Response } from 'express';

import { documentService } from '../config/dependencies.js';
import { SubjectModel } from '../models/Subject.js';
import { ChunkModel } from '../models/Chunk.js';
import { logger } from '../utils/logger.js';
import { decodePossiblyMojibakeFilename } from '../utils/filenameEncoding.js';
import { AppError } from '../middleware/errorHandler.js';
import { upload } from '../middleware/upload.js';
import {
  mongoIdParamValidator,
  uploadDocumentValidators,
  validateRequest,
} from '../middleware/validation.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const documentRoutes = Router();

const resolveDocumentSubjectId = async (document: { subjectId?: unknown; subject: string }): Promise<string | null> => {
  if (document.subjectId) {
    return document.subjectId.toString();
  }

  const subject = await SubjectModel.findOne({ name: document.subject })
    .select('_id')
    .lean()
    .exec();
  return subject?._id.toString() ?? null;
};

const verifyDocumentAccess = async (
  req: Request,
  document: { subjectId?: unknown; subject: string; uploadedBy?: unknown },
): Promise<void> => {
  if (req.user!.role === 'teacher') {
    if (document.uploadedBy && document.uploadedBy.toString() !== req.user!.id) {
      throw new AppError('Access denied. You can only access documents you uploaded.', 403);
    }
    return;
  }

  const subjectId = await resolveDocumentSubjectId(document);
  if (
    !subjectId ||
    !req.user!.enrolledSubjects.some((enrolledId) => enrolledId.toString() === subjectId)
  ) {
    throw new AppError('Access denied. You are not enrolled in this subject.', 403);
  }
};

/**
 * POST /api/documents/upload
 * Teacher only. Multipart form: file + subjectId + chapter + chapterTitle.
 * Stores uploadedBy from req.user.id.
 */
documentRoutes.post(
  '/upload',
  requireAuth,
  requireRole('teacher'),
  upload.single('file'),
  uploadDocumentValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('File is required.', 400);
      }

      const originalName = decodePossiblyMojibakeFilename(req.file.originalname);
      const fileType = path.extname(originalName).toLowerCase().replace('.', '');
      if (!['pdf', 'docx', 'pptx'].includes(fileType)) {
        throw new AppError('Unsupported file type.', 400);
      }

      const subject = await SubjectModel.findById(String(req.body.subjectId)).lean().exec();
      if (!subject) {
        throw new AppError('Subject not found.', 404);
      }
      if (subject.teacherId.toString() !== req.user!.id) {
        throw new AppError('Access denied. You can only upload documents to subjects you created.', 403);
      }

      const document = await documentService.createDocument({
        fileName: req.file.filename,
        originalName,
        fileType: fileType as 'pdf' | 'docx' | 'pptx',
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        subjectId: subject._id.toString(),
        subject: subject.name,
        chapter: Number(req.body.chapter),
        chapterTitle: String(req.body.chapterTitle),
        uploadedBy: req.user!.id,
      });

      res.status(201).json({ success: true, document });

      // Trigger async processing pipeline (parse → chunk → embed → index)
      void documentService.processDocument(document._id.toString()).catch((error) => {
        const message = error instanceof Error ? error.message : 'Unknown processing error';
        logger.error(`Async processing failed: ${message}`);
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/documents
 * Teacher: sees own uploaded documents (optionally filtered by ?subject & ?status).
 * Student: auto-filtered to enrolled subjects only.
 *          With ?subject filter: 403 if not enrolled in that subject.
 */
documentRoutes.get(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let enrolledSubjectNames: string[] | undefined;
      let enrolledSubjectIds: string[] | undefined;

      if (req.user!.role === 'student') {
        enrolledSubjectIds = req.user!.enrolledSubjects.map((id) => id.toString());
        if (req.user!.enrolledSubjects.length > 0) {
          // Keep subject-name fallback for older documents that predate subjectId.
          const subjects = await SubjectModel.find({
            _id: { $in: req.user!.enrolledSubjects },
          })
            .select('name')
            .lean()
            .exec();
          enrolledSubjectNames = subjects.map((s) => s.name);
        } else {
          enrolledSubjectNames = [];
        }
      }

      const documents = await documentService.listDocuments({
        subject: typeof req.query.subject === 'string' ? req.query.subject : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        userRole: req.user!.role,
        uploadedBy: req.user!.role === 'teacher' ? req.user!.id : undefined,
        enrolledSubjectIds,
        enrolledSubjectNames,
      });

      res.json({ success: true, documents });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/documents/:id
 * Any authenticated user.
 * Students: verified against enrolled subjects.
 */
documentRoutes.get(
  '/:id',
  requireAuth,
  mongoIdParamValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const document = await documentService.getDocumentById(id);

      await verifyDocumentAccess(req, document);

      res.json({ success: true, document });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/documents/:id/chunks
 * Scoped content download. Returns plain text chunks sorted by index for e-reader layout.
 * Students: verified against enrolled subjects.
 */
documentRoutes.get(
  '/:id/chunks',
  requireAuth,
  mongoIdParamValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const document = await documentService.getDocumentById(id);

      await verifyDocumentAccess(req, document);

      const chunks = await ChunkModel.find({ documentId: id })
        .sort({ chunkIndex: 1 })
        .select('content chunkIndex pageNumbers')
        .lean()
        .exec();

      res.json({ success: true, chunks });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/documents/:id/file
 * Serves the physical uploaded document file (e.g., PDF) for direct previewing.
 * Students: verified against enrolled subjects.
 */
documentRoutes.get(
  '/:id/file',
  requireAuth,
  mongoIdParamValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const document = await documentService.getDocumentById(id);

      await verifyDocumentAccess(req, document);

      const filePath = path.resolve(env.uploadDir, document.fileName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          code: 'FILE_NOT_FOUND',
          message: 'Physical document file not found on server.',
        });
      }

      // Serve the file with correct inline content disposition
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName)}"`);
      return res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/documents/:id
 * Teacher only.
 */
documentRoutes.delete(
  '/:id',
  requireAuth,
  requireRole('teacher'),
  mongoIdParamValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const deletedChunks = await documentService.deleteDocument(id, {
        role: req.user!.role,
        userId: req.user!.id,
      });
      res.json({ success: true, message: `Document and ${deletedChunks} chunks deleted` });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/documents/:id/assist
 * Retrieve cached DocumentAssist (Key takeaways & flashcards) data.
 */
documentRoutes.get(
  '/:id/assist',
  requireAuth,
  mongoIdParamValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };

      const document = await documentService.getDocumentById(id);
      await verifyDocumentAccess(req, document);

      const assistData = await documentService.getDocumentAssist(id);
      res.json({
        success: true,
        cached: !!assistData,
        data: assistData,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/documents/:id/assist/generate
 * Trigger Gemini LLM study guide generation and save in cache.
 */
documentRoutes.post(
  '/:id/assist/generate',
  requireAuth,
  mongoIdParamValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };

      const document = await documentService.getDocumentById(id);
      await verifyDocumentAccess(req, document);

      const assistData = await documentService.generateDocumentAssist(id);
      res.json({
        success: true,
        data: assistData,
      });
    } catch (error) {
      next(error);
    }
  },
);
