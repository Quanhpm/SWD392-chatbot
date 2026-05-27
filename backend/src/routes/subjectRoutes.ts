import { Router, type NextFunction, type Request, type Response } from 'express';

import {
  listSubjects,
  createSubject,
  enrollStudent,
  deleteSubject,
} from '../services/subjectService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createSubjectValidators,
  enrollValidators,
  mongoIdParamValidator,
  validateRequest,
} from '../middleware/validation.js';

export const subjectRoutes = Router();

/**
 * GET /api/subjects
 * Requires authentication. Both teachers and students can list subjects.
 * Password hash is never returned.
 */
subjectRoutes.get(
  '/',
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const subjects = await listSubjects();
      res.json({ success: true, subjects });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/subjects
 * Teacher only. Body: { name, description?, password }
 * Hashes the course entry password before saving.
 */
subjectRoutes.post(
  '/',
  requireAuth,
  requireRole('teacher'),
  createSubjectValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, password } = req.body as {
        name: string;
        description?: string;
        password: string;
      };

      const subject = await createSubject(name, description, password, req.user!.id);
      res.status(201).json({ success: true, subject });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/subjects/:id/enroll
 * Student only. Body: { password }
 * Verifies course password via bcrypt and adds subject to student's enrolledSubjects.
 */
subjectRoutes.post(
  '/:id/enroll',
  requireAuth,
  requireRole('student'),
  enrollValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const { password } = req.body as { password: string };

      await enrollStudent(id, req.user!.id, password);

      res.json({ success: true, message: 'Successfully enrolled in the subject.' });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/subjects/:id
 * Teacher only. Blocked if documents still reference the subject.
 */
subjectRoutes.delete(
  '/:id',
  requireAuth,
  requireRole('teacher'),
  mongoIdParamValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      await deleteSubject(id);
      res.json({ success: true, message: 'Subject deleted.' });
    } catch (error) {
      next(error);
    }
  },
);
