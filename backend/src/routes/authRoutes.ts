import { Router, type NextFunction, type Request, type Response } from 'express';

import { authService } from '../config/dependencies.js';
import { registerValidators, loginValidators, validateRequest } from '../middleware/validation.js';

export const authRoutes = Router();

/**
 * POST /api/auth/register
 * Public — no token required.
 * Body: { username, password, fullName, email, userCode }
 */
authRoutes.post(
  '/register',
  registerValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password, fullName, email, userCode } = req.body as {
        username: string;
        password: string;
        fullName: string;
        email: string;
        userCode: string;
      };

      const result = await authService.register({ username, password, fullName, email, userCode });

      res.status(201).json({
        success: true,
        token: result.token,
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/auth/login
 * Public — no token required.
 * Body: { username, password }
 */
authRoutes.post(
  '/login',
  loginValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body as { username: string; password: string };

      const result = await authService.login(username, password);

      res.json({
        success: true,
        token: result.token,
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  },
);
