import { SubjectModel, type ISubject } from '../models/Subject.js';
import { DocumentModel } from '../models/Document.js';
import { CourseClassModel } from '../models/CourseClass.js';
import { AppError } from '../middleware/errorHandler.js';
import { getAccessibleSubjectIds } from './accessService.js';
import type { UserRole } from '../types/index.js';

export const listSubjects = async (role: UserRole, userId: string): Promise<ISubject[]> => {
  const query: Record<string, unknown> = {};
  if (role !== 'admin') {
    query._id = { $in: await getAccessibleSubjectIds({ id: userId, role }) };
    query.isActive = true;
  }
  return SubjectModel.find(query).sort({ code: 1 }).lean().exec();
};

export const createSubject = async (
  input: { code: string; name: string; description?: string },
  adminId: string,
): Promise<ISubject> => {
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (await SubjectModel.exists({ $or: [{ code }, { name }] })) {
    throw new AppError('Subject code or name already exists.', 409);
  }
  const subject = await SubjectModel.create({
    code,
    name,
    description: input.description?.trim(),
    isActive: true,
    createdBy: adminId,
  });
  return subject.toObject();
};

export const updateSubject = async (
  id: string,
  input: { code?: string; name?: string; description?: string; isActive?: boolean },
): Promise<ISubject> => {
  const subject = await SubjectModel.findById(id).exec();
  if (!subject) throw new AppError('Subject not found.', 404);

  const code = input.code?.trim().toUpperCase();
  const name = input.name?.trim();
  if (code && await SubjectModel.exists({ code, _id: { $ne: id } })) {
    throw new AppError('Subject code already exists.', 409);
  }
  if (name && await SubjectModel.exists({ name, _id: { $ne: id } })) {
    throw new AppError('Subject name already exists.', 409);
  }
  if (code) subject.code = code;
  if (name) subject.name = name;
  if (input.description !== undefined) subject.description = input.description.trim();
  if (input.isActive !== undefined) subject.isActive = input.isActive;
  await subject.save();
  return subject.toObject();
};

export const archiveSubject = async (id: string): Promise<void> => {
  const subject = await SubjectModel.findById(id).exec();
  if (!subject) throw new AppError('Subject not found.', 404);
  if (await DocumentModel.exists({ subjectId: subject._id, status: { $in: ['processing', 'pending'] } })) {
    throw new AppError('Resolve processing or pending documents before archiving this subject.', 409);
  }
  subject.isActive = false;
  await subject.save();
  await CourseClassModel.updateMany({ subjectId: subject._id }, { status: 'archived' }).exec();
};
