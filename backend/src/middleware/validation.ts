import type { NextFunction, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';

// ─── Existing Validators ─────────────────────────────────────────────────────

export const uploadDocumentValidators = [
  body('subjectId').isMongoId().withMessage('A valid subjectId is required.'),
  body('visibility')
    .isIn(['subject-wide', 'class-restricted'])
    .withMessage('visibility is required and must be subject-wide or class-restricted.'),
  body('classIds')
    .optional()
    .custom((value) => {
      let parsed: unknown = value;
      if (typeof value === 'string') {
        try {
          parsed = JSON.parse(value);
        } catch {
          throw new Error('classIds must be a JSON array.');
        }
      }
      if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id))) {
        throw new Error('classIds must contain valid MongoDB ids.');
      }
      return true;
    }),
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
  body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters.'),
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required.'),
  body('userCode')
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('User code must be 3-30 letters, numbers, underscores, or hyphens.'),
  body('role').optional().equals('student').withMessage('Public registration only supports the student role.'),
];

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
