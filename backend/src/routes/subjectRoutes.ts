import { Router, type NextFunction, type Request, type Response } from 'express';
import { body, param } from 'express-validator';

import { archiveSubject, assignTeacher, createSubject, listSubjectTeachers, listSubjects, removeTeacher, updateSubject } from '../services/subjectService.js';
import { emailService } from '../config/dependencies.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createSubjectValidators, validateRequest } from '../middleware/validation.js';
import { recordAuditLog } from '../services/auditService.js';

export const subjectRoutes = Router();

const objectIdOf = (value: unknown): string => {
  if (value && typeof value === 'object' && '_id' in value) return String((value as { _id: unknown })._id);
  if (value && typeof value === 'object' && 'id' in value) return String((value as { id: unknown }).id);
  return String(value);
};

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
      await recordAuditLog({
        actor: { id: req.user!.id, role: req.user!.role },
        action: 'subject.create',
        entityType: 'subject',
        entityId: objectIdOf(subject),
        metadata: { code: subject.code, name: subject.name },
      });
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
      const subject = await updateSubject(req.params.id as string, req.body, emailService);
      await recordAuditLog({
        actor: { id: req.user!.id, role: req.user!.role },
        action: 'subject.update',
        entityType: 'subject',
        entityId: req.params.id as string,
        metadata: { changedFields: Object.keys(req.body as Record<string, unknown>), isActive: subject.isActive },
      });
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
      await archiveSubject(req.params.id as string, emailService);
      await recordAuditLog({
        actor: { id: req.user!.id, role: req.user!.role },
        action: 'subject.archive',
        entityType: 'subject',
        entityId: req.params.id as string,
        metadata: {},
      });
      res.json({ success: true, message: 'Subject archived.' });
    } catch (error) {
      next(error);
    }
  },
);

subjectRoutes.get(
  '/:id/teachers',
  requireRole('admin'),
  [param('id').isMongoId()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assignments = await listSubjectTeachers(req.params.id as string);
      res.json({ success: true, assignments });
    } catch (error) { next(error); }
  },
);

subjectRoutes.post(
  '/:id/teachers',
  requireRole('admin'),
  [param('id').isMongoId(), body('teacherId').isMongoId()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assignment = await assignTeacher(req.params.id as string, String(req.body.teacherId), req.user!.id, emailService);
      await recordAuditLog({
        actor: { id: req.user!.id, role: req.user!.role },
        action: 'subject.assignment.add',
        entityType: 'subjectAssignment',
        entityId: objectIdOf(assignment),
        metadata: { subjectId: req.params.id, teacherId: String(req.body.teacherId) },
      });
      res.status(201).json({ success: true, assignment });
    } catch (error) { next(error); }
  },
);

subjectRoutes.delete(
  '/:id/teachers/:teacherId',
  requireRole('admin'),
  [param('id').isMongoId(), param('teacherId').isMongoId()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assignment = await removeTeacher(req.params.id as string, req.params.teacherId as string, emailService);
      await recordAuditLog({
        actor: { id: req.user!.id, role: req.user!.role },
        action: 'subject.assignment.remove',
        entityType: 'subjectAssignment',
        entityId: objectIdOf(assignment),
        metadata: { subjectId: req.params.id, teacherId: req.params.teacherId },
      });
      res.json({ success: true, message: 'Teacher removed from subject.' });
    } catch (error) { next(error); }
  },
);
