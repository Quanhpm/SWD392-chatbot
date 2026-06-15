import { Router, type NextFunction, type Request, type Response } from 'express';
import { body, param } from 'express-validator';

import { classService } from '../config/dependencies.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';

export const classRoutes = Router();

classRoutes.use(requireAuth);

classRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classes = await classService.listClasses({ id: req.user!.id, role: req.user!.role });
    res.json({ success: true, classes });
  } catch (error) {
    next(error);
  }
});

classRoutes.post(
  '/',
  requireRole('admin'),
  [
    body('code').trim().isLength({ min: 2, max: 30 }).matches(/^[a-zA-Z0-9_-]+$/),
    body('name').trim().isLength({ min: 2, max: 100 }),
    body('subjectId').isMongoId(),
    body('teacherId').optional({ nullable: true }).isMongoId(),
    body('status').optional().isIn(['draft', 'active', 'archived']),
    body('allowSelfEnrollment').optional().isBoolean(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseClass = await classService.createClass(req.body, req.user!.id);
      res.status(201).json({ success: true, class: courseClass });
    } catch (error) {
      next(error);
    }
  },
);

classRoutes.patch(
  '/:id',
  requireRole('admin'),
  [
    param('id').isMongoId(),
    body('code').optional().trim().isLength({ min: 2, max: 30 }).matches(/^[a-zA-Z0-9_-]+$/),
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('teacherId').optional({ nullable: true }).isMongoId(),
    body('status').optional().isIn(['draft', 'active', 'archived']),
    body('allowSelfEnrollment').optional().isBoolean(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseClass = await classService.updateClass(req.params.id as string, req.body);
      res.json({ success: true, class: courseClass });
    } catch (error) {
      next(error);
    }
  },
);

classRoutes.delete(
  '/:id',
  requireRole('admin'),
  [param('id').isMongoId()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseClass = await classService.updateClass(req.params.id as string, { status: 'archived' });
      res.json({ success: true, class: courseClass });
    } catch (error) {
      next(error);
    }
  },
);

classRoutes.post(
  '/:id/regenerate-code',
  requireRole('admin'),
  [param('id').isMongoId()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const joinCode = await classService.regenerateJoinCode(req.params.id as string);
      res.json({ success: true, joinCode });
    } catch (error) {
      next(error);
    }
  },
);

classRoutes.post(
  '/join',
  requireRole('student'),
  [body('joinCode').trim().isLength({ min: 6, max: 12 })],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await classService.joinClass(req.user!.id, String(req.body.joinCode));
      res.json({ success: true, message: 'Joined class successfully.' });
    } catch (error) {
      next(error);
    }
  },
);

classRoutes.get(
  '/:id/roster',
  requireRole('admin', 'teacher'),
  [param('id').isMongoId()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const enrollments = await classService.getRoster(
        req.params.id as string,
        { id: req.user!.id, role: req.user!.role },
      );
      res.json({ success: true, enrollments });
    } catch (error) {
      next(error);
    }
  },
);

classRoutes.post(
  '/:id/students',
  requireRole('admin'),
  [param('id').isMongoId(), body('studentId').isMongoId()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await classService.addStudent(req.params.id as string, String(req.body.studentId));
      res.status(201).json({ success: true, message: 'Student added to class.' });
    } catch (error) {
      next(error);
    }
  },
);

classRoutes.delete(
  '/:id/students/:studentId',
  requireRole('admin'),
  [param('id').isMongoId(), param('studentId').isMongoId()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await classService.removeStudent(req.params.id as string, req.params.studentId as string);
      res.json({ success: true, message: 'Student removed from class.' });
    } catch (error) {
      next(error);
    }
  },
);
