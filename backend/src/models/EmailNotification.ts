import { Schema, model, type HydratedDocument } from 'mongoose';

export type EmailNotificationStatus = 'queued' | 'sent' | 'failed';

export interface IEmailNotification {
  event: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  text: string;
  html: string;
  status: EmailNotificationStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  messageId?: string;
  nextAttemptAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type EmailNotificationDocument = HydratedDocument<IEmailNotification>;

const emailNotificationSchema = new Schema<IEmailNotification>(
  {
    event: { type: String, required: true, trim: true, index: true },
    recipientEmail: { type: String, required: true, lowercase: true, trim: true },
    recipientName: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    text: { type: String, required: true },
    html: { type: String, required: true },
    status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued', required: true, index: true },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 3, min: 1 },
    lastError: { type: String },
    messageId: { type: String },
    nextAttemptAt: { type: Date, index: true },
    sentAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

emailNotificationSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
emailNotificationSchema.index({ createdAt: -1 });

export const EmailNotificationModel = model<IEmailNotification>('EmailNotification', emailNotificationSchema);
