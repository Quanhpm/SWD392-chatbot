import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface ISubjectAssignment {
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  assignedBy: Types.ObjectId;
  assignedAt: Date;
  status: 'active' | 'removed';
  removedAt?: Date;
}

export type SubjectAssignmentDocument = HydratedDocument<ISubjectAssignment>;

const subjectAssignmentSchema = new Schema<ISubjectAssignment>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAt: { type: Date, default: Date.now, required: true },
    status: { type: String, enum: ['active', 'removed'], default: 'active', required: true },
    removedAt: { type: Date },
  },
  { versionKey: false },
);

subjectAssignmentSchema.index({ subjectId: 1, teacherId: 1 }, { unique: true });
subjectAssignmentSchema.index({ teacherId: 1, status: 1 });
subjectAssignmentSchema.index({ subjectId: 1, status: 1 });

export const SubjectAssignmentModel = model<ISubjectAssignment>('SubjectAssignment', subjectAssignmentSchema);
