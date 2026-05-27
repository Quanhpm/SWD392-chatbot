import type { ICachePort } from '../ports/ICachePort.js';
import { logger } from '../utils/logger.js';

interface CacheEntry {
  value: string; // JSON string representation
  expiry?: number; // Unix timestamp in milliseconds when it expires
}

export class InMemoryCacheAdapter implements ICachePort {
  private store = new Map<string, CacheEntry>();

  constructor() {
    logger.info('🧠 Local In-Memory Cache initialized (Fallback Active).');
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expiry && Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }

    try {
      return JSON.parse(entry.value) as T;
    } catch (error) {
      logger.error(`In-Memory Cache parse error for key "${key}": ${error}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    try {
      const serializedValue = JSON.stringify(value);
      this.store.set(key, { value: serializedValue, expiry });
    } catch (error) {
      logger.error(`In-Memory Cache serialization error for key "${key}": ${error}`);
    }
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) {
      return false;
    }

    if (entry.expiry && Date.now() > entry.expiry) {
      this.store.delete(key);
      return false;
    }

    return true;
  }
}
