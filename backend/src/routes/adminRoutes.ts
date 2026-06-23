import { Router, type NextFunction, type Request, type Response } from 'express';
import { body, param } from 'express-validator';

import { adminService, emailService } from '../config/dependencies.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { listAuditLogs, recordAuditLog } from '../services/auditService.js';
import { SubjectAssignmentModel } from '../models/SubjectAssignment.js';
import { DocumentModel } from '../models/Document.js';
import { EmailNotificationModel } from '../models/EmailNotification.js';
import { SubjectModel } from '../models/Subject.js';
import { UserModel } from '../models/User.js';
import type { UserRole } from '../types/index.js';

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireRole('admin'));

const profileValidators = [
  body('fullName').trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('userCode').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_-]+$/),
];

const objectIdOf = (value: unknown): string => {
  if (value && typeof value === 'object' && '_id' in value) return String((value as { _id: unknown })._id);
  if (value && typeof value === 'object' && 'id' in value) return String((value as { id: unknown }).id);
  return String(value);
};

adminRoutes.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [users, subjects, assignments, processingDocuments, queuedEmails, failedEmails] = await Promise.all([
      UserModel.countDocuments({ isActive: true }).exec(),
      SubjectModel.countDocuments({ isActive: true }).exec(),
      SubjectAssignmentModel.countDocuments({ status: 'active' }).exec(),
      DocumentModel.countDocuments({ status: { $in: ['uploaded', 'processing'] } }).exec(),
      EmailNotificationModel.countDocuments({ status: 'queued' }).exec(),
      EmailNotificationModel.countDocuments({ status: 'failed', attempts: { $lt: 3 } }).exec(),
    ]);
    res.json({ success: true, summary: { users, subjects, assignments, processingDocuments, queuedEmails, failedEmails } });
  } catch (error) {
    next(error);
  }
});

adminRoutes.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = typeof req.query.role === 'string' ? req.query.role as UserRole : undefined;
    const active = req.query.status === 'active' ? true : req.query.status === 'inactive' ? false : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const users = await adminService.listUsers({ role, active, search });
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
});

adminRoutes.post(
  '/users',
  [
    body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
    body('password').isLength({ min: 6, max: 100 }),
    body('role').isIn(['admin', 'teacher', 'student']),
    ...profileValidators,
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await adminService.createUser(req.body as {
        username: string;
        password: string;
        role: UserRole;
        fullName: string;
        email: string;
        userCode: string;
      });
      await recordAuditLog({
        actor: { id: req.user!.id, role: req.user!.role },
        action: 'user.create',
        entityType: 'user',
        entityId: objectIdOf(user),
        metadata: { username: user.username, role: user.role, userCode: user.userCode },
      });
      res.status(201).json({ success: true, user });
    } catch (error) {
      next(error);
    }
  },
);

adminRoutes.patch(
  '/users/:id',
  [param('id').isMongoId(), ...profileValidators.map((validator) => validator.optional())],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await adminService.updateUser(req.params.id as string, req.body);
      await recordAuditLog({
        actor: { id: req.user!.id, role: req.user!.role },
        action: 'user.update',
        entityType: 'user',
        entityId: req.params.id as string,
        metadata: { changedFields: Object.keys(req.body as Record<string, unknown>) },
      });
      res.json({ success: true, user });
    } catch (error) {
      next(error);
    }
  },
);

adminRoutes.patch(
  '/users/:id/password',
  [param('id').isMongoId(), body('password').isLength({ min: 6, max: 100 })],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await adminService.resetPassword(req.params.id as string, String(req.body.password));
      await recordAuditLog({
        actor: { id: req.user!.id, role: req.user!.role },
        action: 'user.password.reset',
        entityType: 'user',
        entityId: req.params.id as string,
        metadata: {},
      });
      res.json({ success: true, message: 'Password reset successfully.' });
    } catch (error) {
      next(error);
    }
  },
);

adminRoutes.delete(
  '/users/:id',
  [param('id').isMongoId()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await adminService.deactivateUser(req.params.id as string, req.user!.id);
      await recordAuditLog({
        actor: { id: req.user!.id, role: req.user!.role },
        action: 'user.deactivate',
        entityType: 'user',
        entityId: req.params.id as string,
        metadata: {},
      });
      res.json({ success: true, message: 'User deactivated.' });
    } catch (error) {
      next(error);
    }
  },
);

adminRoutes.post(
  '/users/:id/activate',
  [param('id').isMongoId()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await adminService.activateUser(req.params.id as string);
      await recordAuditLog({
        actor: { id: req.user!.id, role: req.user!.role },
        action: 'user.activate',
        entityType: 'user',
        entityId: req.params.id as string,
        metadata: {},
      });
      res.json({ success: true, message: 'User activated.' });
    } catch (error) {
      next(error);
    }
  },
);

adminRoutes.get('/email-notifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const limit = Number(req.query.limit ?? 100);
    const query = status && ['queued', 'sent', 'failed'].includes(status) ? { status } : {};
    const notifications = await EmailNotificationModel.find(query)
      .select('-text -html')
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(Number.isFinite(limit) ? limit : 100, 1), 200))
      .lean()
      .exec();
    res.json({ success: true, notifications });
  } catch (error) {
    next(error);
  }
});

adminRoutes.post(
  '/email-notifications/:id/retry',
  [param('id').isMongoId()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notification = await emailService.retryNotification(req.params.id as string);
      res.json({ success: true, notification });
    } catch (error) {
      next(error);
    }
  },
);

adminRoutes.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit ?? 100);
    const logs = await listAuditLogs(Number.isFinite(limit) ? limit : 100);
    res.json({ success: true, logs });
  } catch (error) {
    next(error);
  }
});
