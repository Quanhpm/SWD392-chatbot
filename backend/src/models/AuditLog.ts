import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export type AuditAction =
  | 'user.create'
  | 'user.update'
  | 'user.password.reset'
  | 'user.deactivate'
  | 'user.activate'
  | 'subject.create'
  | 'subject.update'
  | 'subject.archive'
  | 'subject.assignment.add'
  | 'subject.assignment.remove'
  | 'email.retry'
  | 'document.upload'
  | 'document.metadata.update'
  | 'document.delete'
  | 'subscription.subscribe'
  | 'subscription.cancel';

export type AuditEntityType = 'user' | 'subject' | 'subjectAssignment' | 'document' | 'subscription' | 'emailNotification';

export interface IAuditLog {
  actorId: Types.ObjectId;
  actorRole: 'admin' | 'teacher' | 'student';
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: Types.ObjectId;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export type AuditLogDocument = HydratedDocument<IAuditLog>;

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorRole: { type: String, enum: ['admin', 'teacher', 'student'], required: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, enum: ['user', 'subject', 'subjectAssignment', 'document', 'subscription', 'emailNotification'], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export const AuditLogModel = model<IAuditLog>('AuditLog', auditLogSchema);
