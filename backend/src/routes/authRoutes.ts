import { Router, type NextFunction, type Request, type Response } from 'express';

import { authService } from '../config/dependencies.js';
import { loginRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimit.js';
import { loginValidators, passwordResetRequestValidators, passwordResetValidators, validateRequest } from '../middleware/validation.js';

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

authRoutes.post('/forgot-password', passwordResetRateLimiter, passwordResetRequestValidators, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.requestPasswordReset(String(req.body.username));
    res.json({ success: true, message: 'Nếu tài khoản tồn tại, mã xác nhận đã được gửi đến email đăng ký.' });
  } catch (error) { next(error); }
});

authRoutes.post('/reset-password', passwordResetRateLimiter, passwordResetValidators, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.resetPasswordWithCode(String(req.body.username), String(req.body.code), String(req.body.password));
    res.json({ success: true, message: 'Mật khẩu đã được đặt lại thành công.' });
  } catch (error) { next(error); }
});
