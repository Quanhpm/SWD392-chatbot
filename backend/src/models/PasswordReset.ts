import { Schema, model, type HydratedDocument } from 'mongoose';

export interface IPasswordReset {
  userId: Schema.Types.ObjectId;
  username: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  usedAt?: Date;
  createdAt: Date;
}

export type PasswordResetDocument = HydratedDocument<IPasswordReset>;

const passwordResetSchema = new Schema<IPasswordReset>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    username: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    usedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetModel = model<IPasswordReset>('PasswordReset', passwordResetSchema);
