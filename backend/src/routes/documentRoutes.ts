import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { body } from 'express-validator';

import { env } from '../config/environment.js';
import { documentService } from '../config/dependencies.js';
import { ChunkModel } from '../models/Chunk.js';
import { SubjectModel } from '../models/Subject.js';
import { logger } from '../utils/logger.js';
import { decodePossiblyMojibakeFilename } from '../utils/filenameEncoding.js';
import { validateFileSignature } from '../utils/fileSignature.js';
import { AppError } from '../middleware/errorHandler.js';
import { uploadRateLimiter } from '../middleware/rateLimit.js';
import { upload } from '../middleware/upload.js';
import { mongoIdParamValidator, uploadDocumentValidators, validateRequest } from '../middleware/validation.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { assertDocumentAccess, assertSubjectAccess, getAccessibleSubjectIds } from '../services/accessService.js';
import { recordAuditLog } from '../services/auditService.js';

export const documentRoutes = Router();
const actorFrom = (req: Request) => ({ id: req.user!.id, role: req.user!.role });

documentRoutes.post('/upload', requireAuth, requireRole('teacher'), uploadRateLimiter, upload.single('file'), uploadDocumentValidators, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  let keepFile = false;
  try {
    if (!req.file) throw new AppError('File is required.', 400);
    const originalName = decodePossiblyMojibakeFilename(req.file.originalname);
    const fileType = path.extname(originalName).toLowerCase().replace('.', '');
    if (!['pdf', 'docx', 'pptx'].includes(fileType)) throw new AppError('Unsupported file type.', 400);
    if (!(await validateFileSignature(req.file.path, fileType as 'pdf' | 'docx' | 'pptx'))) {
      throw new AppError('File content does not match the declared PDF, DOCX, or PPTX type.', 400);
    }
    const subject = await SubjectModel.findOne({ _id: String(req.body.subjectId), isActive: true }).lean().exec();
    if (!subject) throw new AppError('Active subject not found.', 404);
    await assertSubjectAccess(actorFrom(req), subject._id.toString());
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
    keepFile = true;
    await recordAuditLog({
      actor: actorFrom(req),
      action: 'document.upload',
      entityType: 'document',
      entityId: document._id.toString(),
      metadata: {
        originalName,
        subjectId: subject._id.toString(),
        subject: subject.name,
        fileType,
        fileSize: req.file.size,
      },
    });
    res.status(201).json({ success: true, document });
    void documentService.queueProcessing(document._id.toString()).catch((error) => {
      logger.error(`Async processing queue failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });
  } catch (error) {
    if (req.file && !keepFile) await fs.unlink(req.file.path).catch(() => undefined);
    next(error);
  }
});

documentRoutes.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = actorFrom(req);
    const accessibleSubjectIds = await getAccessibleSubjectIds(actor);
    const documents = await documentService.listDocuments({
      subject: typeof req.query.subject === 'string' ? req.query.subject : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      uploadedByFilter: typeof req.query.uploadedBy === 'string' ? req.query.uploadedBy : undefined,
      userRole: actor.role,
      userId: actor.id,
      accessibleSubjectIds,
    });
    res.json({ success: true, documents });
  } catch (error) { next(error); }
});

documentRoutes.get('/:id', requireAuth, mongoIdParamValidator, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await documentService.getDocumentById(req.params.id as string);
    await assertDocumentAccess(actorFrom(req), document);
    res.json({ success: true, document });
  } catch (error) { next(error); }
});

documentRoutes.get('/:id/chunks', requireAuth, mongoIdParamValidator, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await documentService.getDocumentById(req.params.id as string);
    await assertDocumentAccess(actorFrom(req), document);
    const chunks = await ChunkModel.find({ documentId: document._id }).sort({ chunkIndex: 1 }).select('content chunkIndex pageNumbers').lean().exec();
    res.json({ success: true, chunks });
  } catch (error) { next(error); }
});

documentRoutes.get('/:id/file', requireAuth, mongoIdParamValidator, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await documentService.getDocumentById(req.params.id as string);
    await assertDocumentAccess(actorFrom(req), document);
    const filePath = path.resolve(env.uploadDir, document.fileName);
    if (!fsSync.existsSync(filePath)) throw new AppError('Physical document file not found.', 404);
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(document.originalName)}`);
    res.sendFile(filePath);
  } catch (error) { next(error); }
});

documentRoutes.patch(
  '/:id',
  requireAuth,
  requireRole('admin', 'teacher'),
  [
    ...mongoIdParamValidator,
    body('originalName').optional().trim().isLength({ min: 1, max: 255 }),
    body('chapter').optional().isInt({ min: 0 }),
    body('chapterTitle').optional().trim().isLength({ min: 1, max: 200 }),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const document = await documentService.getDocumentById(req.params.id as string);
      await assertDocumentAccess(actorFrom(req), document, 'manage');
      const updated = await documentService.updateMetadata(req.params.id as string, req.body);
      await recordAuditLog({
        actor: actorFrom(req),
        action: 'document.metadata.update',
        entityType: 'document',
        entityId: req.params.id as string,
        metadata: {
          before: {
            originalName: document.originalName,
            chapter: document.chapter,
            chapterTitle: document.chapterTitle,
          },
          after: req.body,
        },
      });
      res.json({ success: true, document: updated });
    } catch (error) { next(error); }
  },
);

documentRoutes.post('/:id/retry', requireAuth, requireRole('admin', 'teacher'), mongoIdParamValidator, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await documentService.getDocumentById(req.params.id as string);
    await assertDocumentAccess(actorFrom(req), document, 'manage');
    if (!['uploaded', 'failed'].includes(document.status)) throw new AppError('Only uploaded or failed documents can be retried.', 400);
    await documentService.queueProcessing(req.params.id as string);
    res.status(202).json({ success: true, message: 'Document processing restarted.' });
  } catch (error) { next(error); }
});

documentRoutes.delete('/:id', requireAuth, requireRole('admin', 'teacher'), mongoIdParamValidator, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
      const document = await documentService.getDocumentById(req.params.id as string);
      await assertDocumentAccess(actorFrom(req), document, 'manage');
      const deletedChunks = await documentService.deleteDocument(req.params.id as string);
      await recordAuditLog({
        actor: actorFrom(req),
        action: 'document.delete',
        entityType: 'document',
        entityId: req.params.id as string,
        metadata: {
          originalName: document.originalName,
          subjectId: document.subjectId.toString(),
          subject: document.subject,
          deletedChunks,
        },
      });
      res.json({ success: true, message: `Document and ${deletedChunks} chunks deleted.` });
    } catch (error) { next(error); }
});
