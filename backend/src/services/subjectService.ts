import { SubjectModel, type ISubject } from '../models/Subject.js';
import { DocumentModel } from '../models/Document.js';
import { ChunkModel } from '../models/Chunk.js';
import { SubjectAssignmentModel } from '../models/SubjectAssignment.js';
import { UserModel } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { getAccessibleSubjectIds } from './accessService.js';
import type { EmailService } from './emailService.js';
import type { UserRole } from '../types/index.js';

const removeAllAssignments = async (
  subject: { _id: unknown; code: string; name: string },
  emailService: EmailService,
): Promise<void> => {
  const assignments = await SubjectAssignmentModel.find({ subjectId: subject._id, status: 'active' }).select('teacherId').lean().exec();
  await SubjectAssignmentModel.updateMany(
    { subjectId: subject._id, status: 'active' },
    { $set: { status: 'removed', removedAt: new Date() } },
  ).exec();
  const teachers = await UserModel.find({ _id: { $in: assignments.map((item) => item.teacherId) } }).select('email fullName').lean().exec();
  await Promise.all(teachers.map((teacher) => emailService.sendTeacherSubjectAssignment(
    { email: teacher.email, fullName: teacher.fullName },
    { subjectCode: subject.code, subjectName: subject.name, assigned: false },
  )));
};

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
    code, name, description: input.description?.trim(), isActive: true, createdBy: adminId,
  });
  return subject.toObject();
};

export const updateSubject = async (
  id: string,
  input: { code?: string; name?: string; description?: string; isActive?: boolean },
  emailService: EmailService,
): Promise<ISubject> => {
  const subject = await SubjectModel.findById(id).exec();
  if (!subject) throw new AppError('Subject not found.', 404);
  const previousName = subject.name;
  const code = input.code?.trim().toUpperCase();
  const name = input.name?.trim();
  if (code && await SubjectModel.exists({ code, _id: { $ne: id } })) throw new AppError('Subject code already exists.', 409);
  if (name && await SubjectModel.exists({ name, _id: { $ne: id } })) throw new AppError('Subject name already exists.', 409);
  if (code) subject.code = code;
  if (name) subject.name = name;
  if (input.description !== undefined) subject.description = input.description.trim();
  if (input.isActive !== undefined) subject.isActive = input.isActive;
  await subject.save();
  if (subject.name !== previousName) {
    const documents = await DocumentModel.find({ subjectId: subject._id }).select('_id').lean().exec();
    await DocumentModel.updateMany(
      { subjectId: subject._id },
      { $set: { subject: subject.name } },
    ).exec();
    if (documents.length > 0) {
      await ChunkModel.updateMany(
        { documentId: { $in: documents.map((document) => document._id) } },
        { $set: { 'metadata.subject': subject.name } },
      ).exec();
    }
  }
  if (!subject.isActive) {
    await removeAllAssignments(subject, emailService);
  }
  return subject.toObject();
};

export const archiveSubject = async (id: string, emailService: EmailService): Promise<void> => {
  const subject = await SubjectModel.findById(id).exec();
  if (!subject) throw new AppError('Subject not found.', 404);
  if (await DocumentModel.exists({ subjectId: subject._id, status: 'processing' })) {
    throw new AppError('Wait for processing documents before archiving this subject.', 409);
  }
  subject.isActive = false;
  await subject.save();
  await removeAllAssignments(subject, emailService);
};

export const listSubjectTeachers = async (subjectId: string): Promise<unknown[]> =>
  SubjectAssignmentModel.find({ subjectId, status: 'active' })
    .populate('teacherId', 'username fullName email userCode isActive')
    .populate('assignedBy', 'username fullName')
    .sort({ assignedAt: -1 })
    .lean()
    .exec();

export const assignTeacher = async (
  subjectId: string,
  teacherId: string,
  adminId: string,
  emailService: EmailService,
): Promise<unknown> => {
  const [subject, teacher] = await Promise.all([
    SubjectModel.findOne({ _id: subjectId, isActive: true }).lean().exec(),
    UserModel.findOne({ _id: teacherId, role: 'teacher', isActive: true }).lean().exec(),
  ]);
  if (!subject) throw new AppError('Active subject not found.', 404);
  if (!teacher) throw new AppError('Active teacher not found.', 404);
  if (await SubjectAssignmentModel.exists({ subjectId, teacherId, status: 'active' }).exec()) {
    throw new AppError('Teacher is already assigned to this subject.', 409);
  }
  const assignment = await SubjectAssignmentModel.findOneAndUpdate(
    { subjectId, teacherId },
    {
      $set: { status: 'active', assignedBy: adminId, assignedAt: new Date() },
      $unset: { removedAt: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).exec();
  await emailService.sendTeacherSubjectAssignment(
    { email: teacher.email, fullName: teacher.fullName },
    { subjectCode: subject.code, subjectName: subject.name, assigned: true },
  );
  return assignment.toObject();
};

export const removeTeacher = async (
  subjectId: string,
  teacherId: string,
  emailService: EmailService,
): Promise<unknown> => {
  const assignment = await SubjectAssignmentModel.findOneAndUpdate(
    { subjectId, teacherId, status: 'active' },
    { $set: { status: 'removed', removedAt: new Date() } },
    { new: true },
  ).exec();
  if (!assignment) throw new AppError('Active subject assignment not found.', 404);
  const [subject, teacher] = await Promise.all([
    SubjectModel.findById(subjectId).lean().exec(),
    UserModel.findById(teacherId).lean().exec(),
  ]);
  if (subject && teacher) {
    await emailService.sendTeacherSubjectAssignment(
      { email: teacher.email, fullName: teacher.fullName },
      { subjectCode: subject.code, subjectName: subject.name, assigned: false },
    );
  }
  return assignment.toObject();
};
