import { Router, type NextFunction, type Request, type Response } from 'express';

import { authService } from '../config/dependencies.js';
import { loginRateLimiter } from '../middleware/rateLimit.js';
import { loginValidators, validateRequest } from '../middleware/validation.js';

export const authRoutes = Router();

/**
 * POST /api/auth/login
 * Public — no token required.
 * Body: { username, password }
 */
authRoutes.post(
  '/login',
  loginRateLimiter,
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
