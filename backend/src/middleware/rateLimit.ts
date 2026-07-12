import type { NextFunction, Request, Response } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator: (req: Request) => string;
}

const stores = new Set<Map<string, RateLimitEntry>>();

const clientIp = (req: Request): string =>
  req.ip || req.socket.remoteAddress || 'unknown';

export const createRateLimiter = (options: RateLimiterOptions) => {
  const store = new Map<string, RateLimitEntry>();
  stores.add(store);

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = options.keyGenerator(req);
    const current = store.get(key);
    const entry = current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + options.windowMs };

    entry.count += 1;
    store.set(key, entry);

    const remaining = Math.max(0, options.max - entry.count);
    res.setHeader('X-RateLimit-Limit', String(options.max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > options.max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ success: false, error: options.message });
      return;
    }

    next();
  };
};

setInterval(() => {
  const now = Date.now();
  for (const store of stores) {
    for (const [key, value] of store.entries()) {
      if (value.resetAt <= now) store.delete(key);
    }
  }
}, 60_000).unref();

export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 10,
  message: 'Too many login attempts. Please try again later.',
  keyGenerator: (req) => `login:${clientIp(req)}:${String(req.body?.username ?? '').toLowerCase()}`,
});

export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 5,
  message: 'Too many password reset requests. Please try again later.',
  keyGenerator: (req) => `password-reset:${clientIp(req)}:${String(req.body?.username ?? '').toLowerCase()}`,
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60_000,
  max: 30,
  message: 'Too many upload attempts. Please try again later.',
  keyGenerator: (req) => `upload:${req.user?.id ?? clientIp(req)}`,
});

export const chatRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  message: 'Too many chat requests. Please slow down.',
  keyGenerator: (req) => `chat:${req.user?.id ?? clientIp(req)}`,
});
