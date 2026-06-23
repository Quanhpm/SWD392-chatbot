import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../config/environment.js';
import { UserModel } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import type { UserRole } from '../types/index.js';
import { logger } from '../utils/logger.js';

interface AuthResult {
  user: {
    id: string;
    username: string;
    role: UserRole;
    fullName: string;
    email: string;
    userCode: string;
    isActive: boolean;
  };
  token: string;
}

export class AuthService {
  /** Signs a JWT token for a given user record. */
  private generateToken(user: { _id: unknown; username: string; role: string }): string {
    return jwt.sign(
      {
        id: String(user._id),
        username: user.username,
        role: user.role,
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn } as jwt.SignOptions,
    );
  }

  /** Authenticates a user and returns a JWT token. */
  async login(username: string, password: string): Promise<AuthResult> {
    const user = await UserModel.findOne({ username: username.trim() }).exec();
    if (!user) {
      throw new AppError('Invalid username or password.', 401);
    }
    if (!user.isActive) {
      throw new AppError('This account has been deactivated.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid username or password.', 401);
    }

    const token = this.generateToken(user);
    logger.info(`User logged in: ${user.username} (${user.role})`);

    return {
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role as UserRole,
        fullName: user.fullName,
        email: user.email,
        userCode: user.userCode,
        isActive: user.isActive,
      },
      token,
    };
  }
}
