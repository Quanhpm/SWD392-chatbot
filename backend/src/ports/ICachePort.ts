export interface ICachePort {
  /**
   * Retrieves an item from the cache.
   * Returns parsed value of type T, or null if key does not exist.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Stores an item in the cache with an optional TTL (Time To Live) in seconds.
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Deletes an item from the cache.
   */
  del(key: string): Promise<void>;

  /**
   * Checks if a key exists in the cache.
   */
  exists(key: string): Promise<boolean>;
}
