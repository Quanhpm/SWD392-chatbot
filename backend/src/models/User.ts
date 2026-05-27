import { Schema, model, type HydratedDocument, type Types } from 'mongoose';
import bcrypt from 'bcryptjs';

import { env } from '../config/environment.js';

export interface IUser {
  username: string;
  password: string;
  role: 'teacher' | 'student';
  enrolledSubjects: Types.ObjectId[];
  createdAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      required: true,
      enum: ['teacher', 'student'],
    },
    enrolledSubjects: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  },
);

/** Hash password before saving (only if modified). */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
    return;
  }
  this.password = await bcrypt.hash(this.password, env.bcryptSaltRounds);
  next();
});

export const UserModel = model<IUser>('User', userSchema);
