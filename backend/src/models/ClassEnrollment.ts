import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface IClassEnrollment {
  classId: Types.ObjectId;
  studentId: Types.ObjectId;
  source: 'admin' | 'self';
  status: 'active' | 'removed';
  joinedAt: Date;
  removedAt?: Date;
}

export type ClassEnrollmentDocument = HydratedDocument<IClassEnrollment>;

const classEnrollmentSchema = new Schema<IClassEnrollment>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'CourseClass', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    source: { type: String, enum: ['admin', 'self'], required: true },
    status: { type: String, enum: ['active', 'removed'], default: 'active' },
    joinedAt: { type: Date, default: Date.now },
    removedAt: { type: Date },
  },
  { versionKey: false },
);

classEnrollmentSchema.index({ classId: 1, studentId: 1 }, { unique: true });
classEnrollmentSchema.index({ studentId: 1, status: 1 });

export const ClassEnrollmentModel = model<IClassEnrollment>('ClassEnrollment', classEnrollmentSchema);
