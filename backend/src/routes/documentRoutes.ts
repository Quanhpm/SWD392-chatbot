import path from 'node:path';

import { Router, type NextFunction, type Request, type Response } from 'express';

import {
  createDocument,
  deleteDocument,
  getDocumentById,
  listDocuments,
  processDocument,
} from '../services/documentService.js';
import { logger } from '../utils/logger.js';
import { decodePossiblyMojibakeFilename } from '../utils/filenameEncoding.js';
import { AppError } from '../middleware/errorHandler.js';
import { upload } from '../middleware/upload.js';
import { mongoIdParamValidator, uploadDocumentValidators, validateRequest } from '../middleware/validation.js';

export const documentRoutes = Router();

documentRoutes.post(
  '/upload',
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

      const document = await createDocument({
        fileName: req.file.filename,
        originalName,
        fileType: fileType as 'pdf' | 'docx' | 'pptx',
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        subject: String(req.body.subject),
        chapter: Number(req.body.chapter),
        chapterTitle: String(req.body.chapterTitle),
      });

      res.status(201).json({ success: true, document });

      void processDocument(document._id.toString()).catch((error) => {
        const message = error instanceof Error ? error.message : 'Unknown processing error';
        logger.error(`Async processing failed: ${message}`);
      });
    } catch (error) {
      next(error);
    }
  },
);

documentRoutes.get('/', async (req: Request, res: Response, next) => {
  try {
    const documents = await listDocuments({
      subject: typeof req.query.subject === 'string' ? req.query.subject : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
    });
    res.json({ success: true, documents });
  } catch (error) {
    next(error);
  }
});

documentRoutes.get('/:id', mongoIdParamValidator, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const document = await getDocumentById(id);
    res.json({ success: true, document });
  } catch (error) {
    next(error);
  }
});

documentRoutes.delete('/:id', mongoIdParamValidator, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const deletedChunks = await deleteDocument(id);
    res.json({ success: true, message: `Document and ${deletedChunks} chunks deleted` });
  } catch (error) {
    next(error);
  }
});
