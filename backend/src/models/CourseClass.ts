import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface ICourseClass {
  code: string;
  name: string;
  subjectId: Types.ObjectId;
  teacherId?: Types.ObjectId;
  status: 'draft' | 'active' | 'archived';
  allowSelfEnrollment: boolean;
  joinCode: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type CourseClassDocument = HydratedDocument<ICourseClass>;

const courseClassSchema = new Schema<ICourseClass>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft', index: true },
    allowSelfEnrollment: { type: Boolean, default: false },
    joinCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, versionKey: false },
);

courseClassSchema.index({ subjectId: 1, status: 1 });
courseClassSchema.index({ teacherId: 1, status: 1 });

export const CourseClassModel = model<ICourseClass>('CourseClass', courseClassSchema, 'classes');
