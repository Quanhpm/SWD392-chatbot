import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface ISubject {
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export type SubjectDocument = HydratedDocument<ISubject>;

const subjectSchema = new Schema<ISubject>(
  {
    code: { type: String, required: true, unique: true, sparse: true, uppercase: true, trim: true },
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  },
);

export const SubjectModel = model<ISubject>('Subject', subjectSchema);
