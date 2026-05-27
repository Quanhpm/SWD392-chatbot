import type { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: 'teacher' | 'student';
        enrolledSubjects: Types.ObjectId[];
      };
    }
  }
}

export {};
