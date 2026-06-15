import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/environment.js';
import { UserModel } from '../models/User.js';
import type { UserRole } from '../types/index.js';

interface JwtPayload {
  id: string;
  username: string;
  role: UserRole;
}

/**
 * Extracts JWT from Authorization header (Bearer <token>),
 * verifies it, fetches fresh user data, and attaches to req.user.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.query.token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
      return;
    }

    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;

    const user = await UserModel.findById(decoded.id)
      .select('username role fullName email userCode isActive')
      .lean()
      .exec();

    if (!user) {
      res.status(401).json({ success: false, error: 'User not found. Token may be invalid.' });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ success: false, error: 'This account has been deactivated.' });
      return;
    }

    req.user = {
      id: user._id.toString(),
      username: user.username,
      role: user.role as UserRole,
      fullName: user.fullName,
      email: user.email,
      userCode: user.userCode,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'Invalid or expired token.' });
      return;
    }
    next(error);
  }
};

/**
 * Restricts access to specific roles.
 * Must be used AFTER requireAuth middleware.
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}.`,
      });
      return;
    }

    next();
  };
};
