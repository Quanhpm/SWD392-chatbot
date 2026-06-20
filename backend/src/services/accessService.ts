import { Types } from 'mongoose';

import { ClassEnrollmentModel } from '../models/ClassEnrollment.js';
import { CourseClassModel } from '../models/CourseClass.js';
import type { IDocument } from '../models/Document.js';
import { SubjectModel } from '../models/Subject.js';
import { AppError } from '../middleware/errorHandler.js';
import type { UserRole } from '../types/index.js';

export interface Actor {
  id: string;
  role: UserRole;
}

export const getStudentClassIds = async (studentId: string, subjectId?: string): Promise<string[]> => {
  const enrollments = await ClassEnrollmentModel.find({ studentId, status: 'active' })
    .select('classId')
    .lean()
    .exec();
  if (enrollments.length === 0) return [];

  const query: Record<string, unknown> = {
    _id: { $in: enrollments.map((item) => item.classId) },
    status: 'active',
  };
  if (subjectId) query.subjectId = subjectId;

  const classes = await CourseClassModel.find(query).select('_id').lean().exec();
  return classes.map((courseClass) => courseClass._id.toString());
};

export const getTeacherClassIds = async (teacherId: string, subjectId?: string): Promise<string[]> => {
  const query: Record<string, unknown> = { teacherId, status: 'active' };
  if (subjectId) query.subjectId = subjectId;
  const classes = await CourseClassModel.find(query).select('_id').lean().exec();
  return classes.map((courseClass) => courseClass._id.toString());
};

export const getAccessibleClassIds = async (actor: Actor, subjectId?: string): Promise<string[]> => {
  if (actor.role === 'admin') {
    const query: Record<string, unknown> = {};
    if (subjectId) query.subjectId = subjectId;
    const classes = await CourseClassModel.find(query).select('_id').lean().exec();
    return classes.map((courseClass) => courseClass._id.toString());
  }
  return actor.role === 'teacher'
    ? getTeacherClassIds(actor.id, subjectId)
    : getStudentClassIds(actor.id, subjectId);
};

export const getStudentSubjectIds = async (studentId: string): Promise<string[]> => {
  const enrollments = await ClassEnrollmentModel.find({ studentId, status: 'active' })
    .select('classId')
    .lean()
    .exec();
  if (enrollments.length === 0) return [];

  const classes = await CourseClassModel.find({
    _id: { $in: enrollments.map((item) => item.classId) },
    status: 'active',
  }).select('subjectId').lean().exec();
  if (classes.length === 0) return [];

  const activeSubjects = await SubjectModel.find({
    _id: { $in: classes.map((item) => item.subjectId) },
    isActive: true,
  }).select('_id').lean().exec();
  return activeSubjects.map((subject) => subject._id.toString());
};

export const getTeacherSubjectIds = async (teacherId: string): Promise<string[]> => {
  const classes = await CourseClassModel.find({ teacherId, status: 'active' })
    .select('subjectId')
    .lean()
    .exec();
  if (classes.length === 0) return [];

  const activeSubjects = await SubjectModel.find({
    _id: { $in: classes.map((item) => item.subjectId) },
    isActive: true,
  }).select('_id').lean().exec();
  return activeSubjects.map((subject) => subject._id.toString());
};

export const getAccessibleSubjectIds = async (actor: Actor): Promise<string[]> => {
  if (actor.role === 'admin') {
    const subjects = await SubjectModel.find().select('_id').lean().exec();
    return subjects.map((subject) => subject._id.toString());
  }
  return actor.role === 'teacher'
    ? getTeacherSubjectIds(actor.id)
    : getStudentSubjectIds(actor.id);
};

export const hasSubjectAccess = async (actor: Actor, subjectId: string): Promise<boolean> => {
  if (actor.role === 'admin') return true;
  const ids = await getAccessibleSubjectIds(actor);
  return ids.includes(subjectId);
};

export const assertSubjectAccess = async (actor: Actor, subjectId: string): Promise<void> => {
  if (!(await hasSubjectAccess(actor, subjectId))) {
    throw new AppError('Access denied. You do not have access to this subject.', 403);
  }
};

export const resolveUploadClassScope = async (
  teacherId: string,
  subjectId: string,
  visibility: IDocument['visibility'],
  requestedClassIds: string[],
): Promise<Types.ObjectId[]> => {
  if (visibility === 'subject-wide') return [];
  const uniqueClassIds = [...new Set(requestedClassIds)];
  if (uniqueClassIds.length === 0) {
    throw new AppError('Select at least one class for a class-restricted document.', 400);
  }

  const allowedClassIds = await getTeacherClassIds(teacherId, subjectId);
  if (uniqueClassIds.some((id) => !allowedClassIds.includes(id))) {
    throw new AppError('A restricted document can only target your active classes in this subject.', 403);
  }
  return uniqueClassIds.map((id) => new Types.ObjectId(id));
};

const assertDocumentScopeAccess = async (actor: Actor, document: IDocument): Promise<void> => {
  if (!document.visibility || document.visibility === 'subject-wide') {
    await assertSubjectAccess(actor, document.subjectId.toString());
    return;
  }

  const allowedClassIds = new Set((document.classIds ?? []).map((id) => id.toString()));
  if (allowedClassIds.size === 0) {
    throw new AppError('This restricted document has no target class.', 403);
  }
  const actorClassIds = await getAccessibleClassIds(actor, document.subjectId.toString());
  if (!actorClassIds.some((id) => allowedClassIds.has(id))) {
    throw new AppError('This document is restricted to another class.', 403);
  }
};

export type DocumentAccessMode = 'read' | 'chat' | 'assist-generate' | 'delete';

export const assertDocumentAccess = async (
  actor: Actor,
  document: IDocument & { _id?: Types.ObjectId },
  mode: DocumentAccessMode = 'read',
): Promise<void> => {
  if (actor.role === 'admin') return;

  const isUploader = document.uploadedBy.toString() === actor.id;

  if (actor.role === 'student') {
    if (document.status !== 'approved') {
      throw new AppError('This document is not available to students.', 403);
    }
    await assertDocumentScopeAccess(actor, document);
    return;
  }

  if (mode === 'assist-generate') {
    if (!isUploader || !['pending', 'approved'].includes(document.status)) {
      throw new AppError('Only the uploader can generate study assist for a pending or approved document.', 403);
    }
    return;
  }

  if (mode === 'delete') {
    if (!isUploader || document.status === 'approved') {
      throw new AppError('Teachers can only delete their own document before approval.', 403);
    }
    return;
  }

  if (document.status === 'approved') {
    if (isUploader) return;
    await assertDocumentScopeAccess(actor, document);
    return;
  }

  if (document.status === 'pending' && isUploader) return;
  throw new AppError('Teachers can only access approved documents in assigned subjects or their own pending documents.', 403);
};
