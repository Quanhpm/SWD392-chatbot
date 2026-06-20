import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface IQuestionQuota {
  userId: Types.ObjectId;
  periodKey: string;
  questionCount: number;
  periodStart: Date;
  periodEnd: Date;
  lastQuestionAt: Date;
}

export type QuestionQuotaDocument = HydratedDocument<IQuestionQuota>;

const questionQuotaSchema = new Schema<IQuestionQuota>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    periodKey: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    questionCount: { type: Number, default: 0, min: 0 },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    lastQuestionAt: { type: Date, default: Date.now },
  },
  { versionKey: false, autoIndex: false },
);

questionQuotaSchema.index({ userId: 1, periodKey: 1 }, { unique: true });
questionQuotaSchema.index({ periodEnd: 1 });

export const QuestionQuotaModel = model<IQuestionQuota>('QuestionQuota', questionQuotaSchema);
