import fs from 'node:fs/promises';
import path from 'node:path';

import { Router, type Request, type Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const testSetRoutes = Router();
testSetRoutes.use(requireAuth, requireRole('admin'));

const getTestSetPath = async (): Promise<string> => {
  const candidates = [
    path.resolve(process.cwd(), '../test-set.json'),
    path.resolve(process.cwd(), 'test-set.json'),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return candidates[0] ?? path.resolve('test-set.json');
};

testSetRoutes.get('/', async (_req: Request, res: Response, next) => {
  try {
    const testSetPath = await getTestSetPath();
    const content = await fs.readFile(testSetPath, 'utf8');
    res.json(JSON.parse(content));
  } catch (error) {
    next(error);
  }
});
