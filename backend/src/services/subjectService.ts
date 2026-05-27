import bcrypt from 'bcryptjs';

import { env } from '../config/environment.js';
import { SubjectModel, type ISubject } from '../models/Subject.js';
import { UserModel } from '../models/User.js';
import { DocumentModel } from '../models/Document.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

/** Lists all subjects sorted by creation date. Never returns the password hash. */
export const listSubjects = async (): Promise<Omit<ISubject, 'password'>[]> => {
  return SubjectModel.find().select('-password').sort({ createdAt: 1 }).lean().exec() as Promise<
    Omit<ISubject, 'password'>[]
  >;
};

/**
 * Creates a new subject (teacher-only).
 * Explicitly hashes the course entry password before saving.
 */
export const createSubject = async (
  name: string,
  description: string | undefined,
  password: string,
  teacherId: string,
): Promise<Omit<ISubject, 'password'>> => {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new AppError('Subject name is required.', 400);
  }

  if (!password || password.length < 4) {
    throw new AppError('Course password must be at least 4 characters.', 400);
  }

  const existing = await SubjectModel.findOne({ name: trimmed }).lean().exec();
  if (existing) {
    throw new AppError(`Subject "${trimmed}" already exists.`, 409);
  }

  const hashedPassword = await bcrypt.hash(password, env.bcryptSaltRounds);

  const subject = await SubjectModel.create({
    name: trimmed,
    description: description?.trim(),
    password: hashedPassword,
    teacherId,
  });

  const subjectObj = subject.toObject();
  const { password: _pw, ...withoutPassword } = subjectObj;
  return withoutPassword as Omit<ISubject, 'password'>;
};

/**
 * Enrolls a student into a subject by verifying the course password.
 * Adds the subject ObjectId to the student's enrolledSubjects array.
 */
export const enrollStudent = async (
  subjectId: string,
  studentId: string,
  coursePassword: string,
): Promise<void> => {
  const subject = await SubjectModel.findById(subjectId).exec();
  if (!subject) {
    throw new AppError('Subject not found.', 404);
  }

  const student = await UserModel.findById(studentId).exec();
  if (!student) {
    throw new AppError('Student not found.', 404);
  }

  if (student.enrolledSubjects.some((id) => id.toString() === subjectId)) {
    throw new AppError('You are already enrolled in this subject.', 409);
  }

  // Verify course password against the bcrypt hash
  const isMatch = await bcrypt.compare(coursePassword, subject.password);
  if (!isMatch) {
    throw new AppError('Incorrect course password.', 403);
  }

  student.enrolledSubjects.push(subject._id);
  await student.save();

  logger.info(`Student "${student.username}" enrolled in "${subject.name}"`);
};

/** Deletes a subject by ID. Blocks deletion if documents still reference it. */
export const deleteSubject = async (id: string): Promise<void> => {
  const subject = await SubjectModel.findById(id).exec();
  if (!subject) {
    throw new AppError('Subject not found.', 404);
  }

  const docCount = await DocumentModel.countDocuments({ subject: subject.name }).exec();
  if (docCount > 0) {
    throw new AppError(
      `Cannot delete "${subject.name}" because ${docCount} document(s) still belong to it. Delete the documents first.`,
      409,
    );
  }

  await subject.deleteOne();
};
