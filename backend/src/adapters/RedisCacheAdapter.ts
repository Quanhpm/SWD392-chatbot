import { createClient, type RedisClientType } from 'redis';
import type { ICachePort } from '../ports/ICachePort.js';
import { logger } from '../utils/logger.js';

export class RedisCacheAdapter implements ICachePort {
  private client: RedisClientType;
  private isConnected = false;

  constructor(redisUrl: string) {
    this.client = createClient({ url: redisUrl });

    this.client.on('connect', () => {
      logger.info('⚡ Connecting to Redis server...');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      logger.info('⚡ Redis Client connected successfully!');
    });

    this.client.on('error', (err) => {
      logger.error(`❌ Redis Client Error: ${err}`);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      logger.warn('⚠️ Redis Client connection closed.');
      this.isConnected = false;
    });

    // Start connection asynchronously
    void this.client.connect().catch((err) => {
      logger.error(`❌ Failed to establish initial Redis connection: ${err}`);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      return null;
    }
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      logger.error(`Redis parse error for key "${key}": ${err}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.set(key, serialized, { EX: ttlSeconds });
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err) {
      logger.error(`Redis set error for key "${key}": ${err}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    try {
      await this.client.del(key);
    } catch (err) {
      logger.error(`Redis del error for key "${key}": ${err}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }
    try {
      const count = await this.client.exists(key);
      return count > 0;
    } catch (err) {
      logger.error(`Redis exists error for key "${key}": ${err}`);
      return false;
    }
  }
}
