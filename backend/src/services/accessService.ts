import type { Types } from 'mongoose';

import type { IDocument } from '../models/Document.js';
import { SubjectModel } from '../models/Subject.js';
import { SubjectAssignmentModel } from '../models/SubjectAssignment.js';
import { AppError } from '../middleware/errorHandler.js';
import type { UserRole } from '../types/index.js';

export interface Actor {
  id: string;
  role: UserRole;
}

export const getTeacherSubjectIds = async (teacherId: string): Promise<string[]> => {
  const assignments = await SubjectAssignmentModel.find({ teacherId, status: 'active' })
    .select('subjectId')
    .lean()
    .exec();
  if (assignments.length === 0) return [];
  const subjects = await SubjectModel.find({
    _id: { $in: assignments.map((item) => item.subjectId) },
    isActive: true,
  }).select('_id').lean().exec();
  return subjects.map((subject) => subject._id.toString());
};

export const getAccessibleSubjectIds = async (actor: Actor): Promise<string[]> => {
  const query = actor.role === 'teacher'
    ? { _id: { $in: await getTeacherSubjectIds(actor.id) }, isActive: true }
    : actor.role === 'student' ? { isActive: true } : {};
  const subjects = await SubjectModel.find(query).select('_id').lean().exec();
  return subjects.map((subject) => subject._id.toString());
};

export const hasSubjectAccess = async (actor: Actor, subjectId: string): Promise<boolean> => {
  if (actor.role === 'admin') return Boolean(await SubjectModel.exists({ _id: subjectId }));
  if (actor.role === 'student') return Boolean(await SubjectModel.exists({ _id: subjectId, isActive: true }));
  return Boolean(await SubjectAssignmentModel.exists({ subjectId, teacherId: actor.id, status: 'active' }))
    && Boolean(await SubjectModel.exists({ _id: subjectId, isActive: true }));
};

export const assertSubjectAccess = async (actor: Actor, subjectId: string): Promise<void> => {
  if (!(await hasSubjectAccess(actor, subjectId))) {
    throw new AppError('Access denied. You do not have access to this subject.', 403);
  }
};

export type DocumentAccessMode = 'read' | 'chat' | 'manage';

export const assertDocumentAccess = async (
  actor: Actor,
  document: IDocument & { _id?: Types.ObjectId },
  mode: DocumentAccessMode = 'read',
): Promise<void> => {
  if (actor.role === 'admin') return;

  const subjectId = document.subjectId.toString();
  const isUploader = document.uploadedBy.toString() === actor.id;

  if (actor.role === 'student') {
    if (mode === 'manage' || document.status !== 'ready') {
      throw new AppError('This document is not available.', 403);
    }
    await assertSubjectAccess(actor, subjectId);
    return;
  }

  await assertSubjectAccess(actor, subjectId);
  if (mode === 'manage' && !isUploader) {
    throw new AppError('Teachers can only manage documents they uploaded.', 403);
  }
  if (mode !== 'manage' && document.status !== 'ready' && !isUploader) {
    throw new AppError('This document is not ready.', 403);
  }
};
