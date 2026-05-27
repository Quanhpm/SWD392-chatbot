import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface ISubject {
  name: string;
  description?: string;
  password: string;          // bcrypt-hashed course entry password
  teacherId: Types.ObjectId; // ref → User (teacher who created it)
  createdAt: Date;
}

export type SubjectDocument = HydratedDocument<ISubject>;

const subjectSchema = new Schema<ISubject>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    password: { type: String, required: true },
    teacherId: {
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
