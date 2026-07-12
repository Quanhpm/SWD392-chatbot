import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/environment.js';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

/** Sends consistent JSON errors for all API failures. */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error(`[${req.method} ${req.path}] ${err.message}`, err.stack);

  const multerCode = (err as Error & { code?: string }).code;
  const statusCode = err instanceof AppError
    ? err.statusCode
    : multerCode === 'LIMIT_FILE_SIZE' ? 413
      : multerCode === 'LIMIT_UNEXPECTED_FILE' ? 400
        : 500;
  const message = env.nodeEnv === 'production' && statusCode === 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({ success: false, error: message });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` });
};
