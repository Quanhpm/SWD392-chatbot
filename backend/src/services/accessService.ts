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

export type DocumentAccessMode = 'read' | 'chat' | 'assist-generate' | 'delete';

export const assertDocumentAccess = async (
  actor: Actor,
  document: IDocument & { _id?: Types.ObjectId },
  mode: DocumentAccessMode = 'read',
): Promise<void> => {
  if (actor.role === 'admin') return;

  const subjectId = document.subjectId.toString();
  const isUploader = document.uploadedBy.toString() === actor.id;

  if (actor.role === 'student') {
    if (document.status !== 'approved') {
      throw new AppError('This document is not available to students.', 403);
    }
    await assertSubjectAccess(actor, subjectId);
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
    await assertSubjectAccess(actor, subjectId);
    return;
  }

  if (document.status === 'pending' && isUploader) return;
  throw new AppError('Teachers can only access approved documents in assigned subjects or their own pending documents.', 403);
};
