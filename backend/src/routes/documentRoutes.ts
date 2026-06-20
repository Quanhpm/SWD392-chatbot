import fs from 'node:fs';
import path from 'node:path';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { body, param } from 'express-validator';

import { env } from '../config/environment.js';
import { documentService } from '../config/dependencies.js';
import { ChunkModel } from '../models/Chunk.js';
import { SubjectModel } from '../models/Subject.js';
import { logger } from '../utils/logger.js';
import { decodePossiblyMojibakeFilename } from '../utils/filenameEncoding.js';
import { AppError } from '../middleware/errorHandler.js';
import { upload } from '../middleware/upload.js';
import { mongoIdParamValidator, uploadDocumentValidators, validateRequest } from '../middleware/validation.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  assertDocumentAccess,
  assertSubjectAccess,
  getAccessibleClassIds,
  getAccessibleSubjectIds,
  resolveUploadClassScope,
} from '../services/accessService.js';

export const documentRoutes = Router();

const actorFrom = (req: Request) => ({ id: req.user!.id, role: req.user!.role });

documentRoutes.post(
  '/upload',
  requireAuth,
  requireRole('teacher'),
  upload.single('file'),
  uploadDocumentValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('File is required.', 400);
      const originalName = decodePossiblyMojibakeFilename(req.file.originalname);
      const fileType = path.extname(originalName).toLowerCase().replace('.', '');
      if (!['pdf', 'docx', 'pptx'].includes(fileType)) throw new AppError('Unsupported file type.', 400);

      const subject = await SubjectModel.findOne({ _id: String(req.body.subjectId), isActive: true }).lean().exec();
      if (!subject) throw new AppError('Active subject not found.', 404);
      await assertSubjectAccess(actorFrom(req), subject._id.toString());
      const visibility = req.body.visibility as 'subject-wide' | 'class-restricted';
      const requestedClassIds = typeof req.body.classIds === 'string'
        ? JSON.parse(req.body.classIds) as string[]
        : Array.isArray(req.body.classIds) ? req.body.classIds as string[] : [];
      const classIds = await resolveUploadClassScope(
        req.user!.id,
        subject._id.toString(),
        visibility,
        requestedClassIds,
      );

      const document = await documentService.createDocument({
        fileName: req.file.filename,
        originalName,
        fileType: fileType as 'pdf' | 'docx' | 'pptx',
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        subjectId: subject._id.toString(),
        subject: subject.name,
        visibility,
        classIds,
        chapter: Number(req.body.chapter),
        chapterTitle: String(req.body.chapterTitle),
        uploadedBy: req.user!.id,
      });
      res.status(201).json({ success: true, document });
      void documentService.processDocument(document._id.toString()).catch((error) => {
        logger.error(`Async processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      });
    } catch (error) {
      next(error);
    }
  },
);

documentRoutes.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = actorFrom(req);
    const [accessibleSubjectIds, accessibleClassIds] = await Promise.all([
      getAccessibleSubjectIds(actor),
      getAccessibleClassIds(actor),
    ]);
    const documents = await documentService.listDocuments({
      subject: typeof req.query.subject === 'string' ? req.query.subject : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      uploadedByFilter: typeof req.query.uploadedBy === 'string' ? req.query.uploadedBy : undefined,
      userRole: actor.role,
      userId: actor.id,
      accessibleSubjectIds,
      accessibleClassIds,
    });
    res.json({ success: true, documents });
  } catch (error) {
    next(error);
  }
});

documentRoutes.post('/:id/approve', requireAuth, requireRole('admin'), mongoIdParamValidator, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await documentService.approveDocument(req.params.id as string, req.user!.id);
    res.json({ success: true, document });
  } catch (error) {
    next(error);
  }
});

documentRoutes.post(
  '/:id/reject',
  requireAuth,
  requireRole('admin'),
  [param('id').isMongoId(), body('reason').trim().isLength({ min: 3, max: 500 })],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const document = await documentService.rejectDocument(req.params.id as string, req.user!.id, String(req.body.reason));
      res.json({ success: true, document });
    } catch (error) {
      next(error);
    }
  },
);

documentRoutes.get('/:id', requireAuth, mongoIdParamValidator, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await documentService.getDocumentById(req.params.id as string);
    await assertDocumentAccess(actorFrom(req), document);
    res.json({ success: true, document });
  } catch (error) {
    next(error);
  }
});

documentRoutes.get('/:id/chunks', requireAuth, mongoIdParamValidator, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await documentService.getDocumentById(req.params.id as string);
    await assertDocumentAccess(actorFrom(req), document);
    const chunks = await ChunkModel.find({ documentId: document._id }).sort({ chunkIndex: 1 }).select('content chunkIndex pageNumbers').lean().exec();
    res.json({ success: true, chunks });
  } catch (error) {
    next(error);
  }
});

documentRoutes.get('/:id/file', requireAuth, mongoIdParamValidator, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await documentService.getDocumentById(req.params.id as string);
    await assertDocumentAccess(actorFrom(req), document);
    const filePath = path.resolve(env.uploadDir, document.fileName);
    if (!fs.existsSync(filePath)) throw new AppError('Physical document file not found.', 404);
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName)}"`);
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

documentRoutes.delete('/:id', requireAuth, requireRole('admin', 'teacher'), mongoIdParamValidator, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await documentService.getDocumentById(req.params.id as string);
    await assertDocumentAccess(actorFrom(req), document, 'delete');
    const deletedChunks = await documentService.deleteDocument(req.params.id as string);
    res.json({ success: true, message: `Document and ${deletedChunks} chunks deleted.` });
  } catch (error) {
    next(error);
  }
});

documentRoutes.get('/:id/assist', requireAuth, mongoIdParamValidator, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await documentService.getDocumentById(req.params.id as string);
    await assertDocumentAccess(actorFrom(req), document);
    const assistData = await documentService.getDocumentAssist(req.params.id as string);
    res.json({ success: true, cached: Boolean(assistData), data: assistData });
  } catch (error) {
    next(error);
  }
});

documentRoutes.post('/:id/assist/generate', requireAuth, requireRole('teacher'), mongoIdParamValidator, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await documentService.getDocumentById(req.params.id as string);
    await assertDocumentAccess(actorFrom(req), document, 'assist-generate');
    const assistData = await documentService.generateDocumentAssist(req.params.id as string);
    res.json({ success: true, data: assistData });
  } catch (error) {
    next(error);
  }
});
