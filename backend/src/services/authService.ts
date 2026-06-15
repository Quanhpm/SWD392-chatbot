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

  /** Registers a new user. Password is hashed by the User model pre-save hook. */
  async register(input: {
    username: string;
    password: string;
    fullName: string;
    email: string;
    userCode: string;
  }): Promise<AuthResult> {
    const existing = await UserModel.findOne({
      $or: [
        { username: input.username.trim() },
        { email: input.email.trim().toLowerCase() },
        { userCode: input.userCode.trim().toUpperCase() },
      ],
    }).lean().exec();
    if (existing) {
      throw new AppError('Username, email, or user code already exists.', 409);
    }

    const user = await UserModel.create({
      username: input.username.trim(),
      password: input.password,
      role: 'student',
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      userCode: input.userCode.trim().toUpperCase(),
      isActive: true,
    });

    const token = this.generateToken(user);
    logger.info(`User registered: ${user.username} (${user.role})`);

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
