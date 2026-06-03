import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import type { DocumentStatus, FileType } from '../types/index.js';

export interface IDocument {
  fileName: string;
  originalName: string;
  fileType: FileType;
  fileSize: number;
  mimeType: string;
  subjectId: Types.ObjectId; // ref -> Subject
  subject: string;
  chapter: number;
  chapterTitle: string;
  status: DocumentStatus;
  errorMessage?: string;
  totalChunks: number;
  totalPages?: number;
  uploadedAt: Date;
  processedAt?: Date;
  indexedAt?: Date;
  uploadedBy: Types.ObjectId; // ref → User (teacher who uploaded)
}

export type DocumentDocument = HydratedDocument<IDocument>;

const documentSchema = new Schema<IDocument>(
  {
    fileName: { type: String, required: true, unique: true },
    originalName: { type: String, required: true },
    fileType: { type: String, required: true, enum: ['pdf', 'docx', 'pptx'] },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    subject: { type: String, required: true, trim: true },
    chapter: { type: Number, required: true, min: 0 },
    chapterTitle: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['uploaded', 'processing', 'indexed', 'failed'],
      default: 'uploaded',
    },
    errorMessage: { type: String },
    totalChunks: { type: Number, default: 0 },
    totalPages: { type: Number },
    uploadedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    indexedAt: { type: Date },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    versionKey: false,
  },
);

documentSchema.index({ subjectId: 1, status: 1 });
documentSchema.index({ subject: 1, status: 1 });
documentSchema.index({ uploadedAt: -1 });

export const DocumentModel = model<IDocument>('Document', documentSchema);
