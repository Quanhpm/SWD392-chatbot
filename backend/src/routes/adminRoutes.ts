import { Router, type NextFunction, type Request, type Response } from 'express';
import { body, param } from 'express-validator';

import { adminService } from '../config/dependencies.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { CourseClassModel } from '../models/CourseClass.js';
import { DocumentModel } from '../models/Document.js';
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

adminRoutes.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [users, subjects, classes, pendingDocuments] = await Promise.all([
      UserModel.countDocuments({ isActive: true }).exec(),
      SubjectModel.countDocuments({ isActive: true }).exec(),
      CourseClassModel.countDocuments({ status: 'active' }).exec(),
      DocumentModel.countDocuments({ status: 'pending' }).exec(),
    ]);
    res.json({ success: true, summary: { users, subjects, classes, pendingDocuments } });
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
      res.json({ success: true, message: 'User activated.' });
    } catch (error) {
      next(error);
    }
  },
);
