import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface IQuestionQuota {
  userId: Types.ObjectId;
  documentId: Types.ObjectId;
  questionCount: number;
  periodStart: Date;
  periodEnd: Date | null;
  lastQuestionAt: Date;
}

export type QuestionQuotaDocument = HydratedDocument<IQuestionQuota>;

const questionQuotaSchema = new Schema<IQuestionQuota>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    questionCount: { type: Number, default: 0, min: 0 },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, default: null },
    lastQuestionAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

questionQuotaSchema.index(
  { userId: 1, documentId: 1 },
  { unique: true, partialFilterExpression: { documentId: { $exists: true } } },
);

export const QuestionQuotaModel = model<IQuestionQuota>('QuestionQuota', questionQuotaSchema);
