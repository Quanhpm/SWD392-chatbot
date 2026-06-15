import type { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: 'admin' | 'teacher' | 'student';
        fullName: string;
        email: string;
        userCode: string;
      };
    }
  }
}

export {};
