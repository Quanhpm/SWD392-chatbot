import { Router, type NextFunction, type Request, type Response } from 'express';
import { body, param } from 'express-validator';

import { archiveSubject, createSubject, listSubjects, updateSubject } from '../services/subjectService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createSubjectValidators, validateRequest } from '../middleware/validation.js';

export const subjectRoutes = Router();

subjectRoutes.use(requireAuth);

subjectRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subjects = await listSubjects(req.user!.role, req.user!.id);
    res.json({ success: true, subjects });
  } catch (error) {
    next(error);
  }
});

subjectRoutes.post(
  '/',
  requireRole('admin'),
  createSubjectValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subject = await createSubject(req.body, req.user!.id);
      res.status(201).json({ success: true, subject });
    } catch (error) {
      next(error);
    }
  },
);

subjectRoutes.patch(
  '/:id',
  requireRole('admin'),
  [
    param('id').isMongoId(),
    body('code').optional().trim().isLength({ min: 2, max: 20 }).matches(/^[a-zA-Z0-9_-]+$/),
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('isActive').optional().isBoolean(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subject = await updateSubject(req.params.id as string, req.body);
      res.json({ success: true, subject });
    } catch (error) {
      next(error);
    }
  },
);

subjectRoutes.delete(
  '/:id',
  requireRole('admin'),
  [param('id').isMongoId()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await archiveSubject(req.params.id as string);
      res.json({ success: true, message: 'Subject archived.' });
    } catch (error) {
      next(error);
    }
  },
);
