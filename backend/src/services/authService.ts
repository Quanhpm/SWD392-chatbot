import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../config/environment.js';
import { UserModel } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import type { UserRole } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { PasswordResetModel } from '../models/PasswordReset.js';
import type { EmailService } from './emailService.js';
import { createHash, randomInt } from 'node:crypto';

const RESET_CODE_TTL_MINUTES = 10;
const RESET_CODE_MAX_ATTEMPTS = 5;

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
  constructor(private readonly emailService: EmailService) {}

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

  async requestPasswordReset(username: string): Promise<void> {
    const normalizedUsername = username.trim();
    const user = await UserModel.findOne({ username: normalizedUsername }).exec();
    if (!user || !user.isActive) return;

    await PasswordResetModel.deleteMany({ userId: user._id, usedAt: { $exists: false } }).exec();
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await PasswordResetModel.create({
      userId: user._id,
      username: user.username,
      codeHash: createHash('sha256').update(code).digest('hex'),
      expiresAt: new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60_000),
      attempts: 0,
    });
    await this.emailService.sendPasswordResetCode(
      { email: user.email, fullName: user.fullName },
      code,
      RESET_CODE_TTL_MINUTES,
    );
  }

  async resetPasswordWithCode(username: string, code: string, password: string): Promise<void> {
    const normalizedUsername = username.trim();
    const reset = await PasswordResetModel.findOne({
      username: normalizedUsername,
      usedAt: { $exists: false },
    }).sort({ createdAt: -1 }).exec();
    const codeHash = createHash('sha256').update(code.trim()).digest('hex');

    if (!reset || reset.expiresAt.getTime() <= Date.now() || reset.attempts >= RESET_CODE_MAX_ATTEMPTS) {
      throw new AppError('Mã xác nhận không hợp lệ hoặc đã hết hạn.', 400);
    }
    if (reset.codeHash !== codeHash) {
      reset.attempts += 1;
      await reset.save();
      throw new AppError('Mã xác nhận không hợp lệ hoặc đã hết hạn.', 400);
    }

    const user = await UserModel.findById(reset.userId).exec();
    if (!user || !user.isActive) throw new AppError('Mã xác nhận không hợp lệ hoặc đã hết hạn.', 400);
    user.password = password;
    await user.save();
    reset.usedAt = new Date();
    await reset.save();
  }
}
