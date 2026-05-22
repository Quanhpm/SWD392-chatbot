import type { NextFunction, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';

export const uploadDocumentValidators = [
  body('subject').trim().notEmpty().withMessage('Subject is required.'),
  body('chapter').isInt({ min: 0 }).withMessage('Chapter must be a non-negative integer.'),
  body('chapterTitle').trim().notEmpty().withMessage('Chapter title is required.'),
];

export const createSessionValidators = [
  body('title').optional().trim().isLength({ min: 1, max: 120 }).withMessage('Title must be 1-120 characters.'),
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
