import { Schema, model, type HydratedDocument, type Types } from 'mongoose';
import bcrypt from 'bcryptjs';

import { env } from '../config/environment.js';

export interface IUser {
  username: string;
  password: string;
  role: 'admin' | 'teacher' | 'student';
  fullName: string;
  email: string;
  userCode: string;
  isActive: boolean;
  deactivatedAt?: Date;
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
      enum: ['admin', 'teacher', 'student'],
    },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, sparse: true, lowercase: true, trim: true },
    userCode: { type: String, required: true, unique: true, sparse: true, uppercase: true, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    deactivatedAt: { type: Date },
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
