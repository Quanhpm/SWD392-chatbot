import { Types } from 'mongoose';

import { AuditLogModel, type AuditAction, type AuditEntityType, type IAuditLog } from '../models/AuditLog.js';
import type { UserRole } from '../types/index.js';

export interface AuditActor {
  id: string;
  role: UserRole;
}

export const recordAuditLog = async (input: {
  actor: AuditActor;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> => {
  await AuditLogModel.create({
    actorId: new Types.ObjectId(input.actor.id),
    actorRole: input.actor.role,
    action: input.action,
    entityType: input.entityType,
    entityId: new Types.ObjectId(input.entityId),
    metadata: input.metadata ?? {},
  });
};

export const listAuditLogs = async (limit = 100): Promise<IAuditLog[]> =>
  AuditLogModel.find({})
    .populate('actorId', 'username fullName userCode role')
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 200))
    .lean()
    .exec() as unknown as Promise<IAuditLog[]>;
