import mongoose from 'mongoose';

import { env } from './environment.js';
import { logger } from '../utils/logger.js';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2_000;

const delay = async (milliseconds: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

/** Connects to MongoDB with simple retry logic for local Docker startup. */
export const connectDatabase = async (): Promise<void> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await mongoose.connect(env.mongodbUri);
      logger.info('MongoDB connected');
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown MongoDB error';
      logger.error(`MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${message}`);

      if (attempt === MAX_RETRIES) {
        throw error;
      }
      await delay(RETRY_DELAY_MS);
    }
  }
};
