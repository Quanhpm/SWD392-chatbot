import type { NextFunction, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';

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

  res.status(400).json({
    success: false,
    error: errors
      .array()
      .map((error) => error.msg)
      .join(' '),
  });
};

// ─── Auth Validators ──────────────────────────────────────────────────────────

export const registerValidators = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters.')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores.'),
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Password must be 6-100 characters.'),
  body('role')
    .isIn(['teacher', 'student'])
    .withMessage('Role must be "teacher" or "student".'),
];

export const loginValidators = [
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

// ─── Subject Validators ───────────────────────────────────────────────────────

export const createSubjectValidators = [
  body('name').trim().notEmpty().withMessage('Subject name is required.'),
  body('password')
    .isLength({ min: 4 })
    .withMessage('Course password must be at least 4 characters.'),
  body('description').optional().trim(),
];

export const enrollValidators = [
  param('id').isMongoId().withMessage('Invalid subject id.'),
  body('password').notEmpty().withMessage('Course password is required.'),
];
