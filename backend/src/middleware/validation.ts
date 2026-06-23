import type { NextFunction, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import fs from 'node:fs';

// ─── Existing Validators ─────────────────────────────────────────────────────

export const uploadDocumentValidators = [
  body('subjectId').isMongoId().withMessage('A valid subjectId is required.'),
  body('chapter').isInt({ min: 0 }).withMessage('Chapter must be a non-negative integer.'),
  body('chapterTitle').trim().notEmpty().withMessage('Chapter title is required.'),
];

/** @deprecated Use createSessionWithDocumentValidators for new code */
export const createSessionValidators = [
  body('title').optional().trim().isLength({ min: 1, max: 120 }).withMessage('Title must be 1-120 characters.'),
];

export const createSessionWithDocumentValidators = [
  body('documentId').isMongoId().withMessage('A valid documentId (MongoDB ObjectId) is required.'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Title must be 1-120 characters.'),
];

export const sendMessageValidators = [
  param('id').isMongoId().withMessage('Invalid session id.'),
  body('message').trim().isLength({ min: 1, max: 2_000 }).withMessage('Message must be 1-2000 characters.'),
];

export const mongoIdParamValidator = [param('id').isMongoId().withMessage('Invalid id.')];

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    next();
    return;
  }

  if (req.file?.path) {
    fs.unlink(req.file.path, () => undefined);
  }

  res.status(400).json({
    success: false,
    error: errors
      .array()
      .map((error) => error.msg)
      .join(' '),
  });
};

// ─── Auth Validators ──────────────────────────────────────────────────────────

export const loginValidators = [
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

// ─── Subject Validators ───────────────────────────────────────────────────────

export const createSubjectValidators = [
  body('code')
    .trim()
    .isLength({ min: 2, max: 20 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Subject code must be 2-20 letters, numbers, underscores, or hyphens.'),
  body('name').trim().notEmpty().withMessage('Subject name is required.'),
  body('description').optional().trim(),
];
