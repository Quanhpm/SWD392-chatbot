import { randomBytes } from 'node:crypto';
import { Types } from 'mongoose';

import { ClassEnrollmentModel } from '../models/ClassEnrollment.js';
import { CourseClassModel, type ICourseClass } from '../models/CourseClass.js';
import { SubjectModel } from '../models/Subject.js';
import { UserModel } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import type { Actor } from './accessService.js';
import type { EmailService } from './emailService.js';

const generateJoinCode = async (): Promise<string> => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = Array.from(randomBytes(8), (byte) => alphabet.charAt(byte % alphabet.length)).join('');
    if (!(await CourseClassModel.exists({ joinCode: code }))) return code;
  }
  throw new AppError('Could not generate a unique join code.', 500);
};

const validateTeacher = async (teacherId?: string): Promise<void> => {
  if (!teacherId) return;
  const teacher = await UserModel.findOne({ _id: teacherId, role: 'teacher', isActive: true }).lean().exec();
  if (!teacher) throw new AppError('An active teacher is required.', 400);
};

export class ClassService {
  constructor(private readonly emailService: EmailService) {}

  async listClasses(actor: Actor): Promise<unknown[]> {
    let query: Record<string, unknown> = {};
    let enrolledIds: string[] = [];
    if (actor.role === 'teacher') query = { teacherId: actor.id };
    if (actor.role === 'student') {
      const enrollments = await ClassEnrollmentModel.find({ studentId: actor.id, status: 'active' })
        .select('classId').lean().exec();
      enrolledIds = enrollments.map((item) => item.classId.toString());
      query = {
        status: 'active',
        $or: [{ _id: { $in: enrolledIds } }, { allowSelfEnrollment: true }],
      };
    }

    const classes = await CourseClassModel.find(query)
      .populate('subjectId', 'code name description isActive')
      .populate('teacherId', 'username fullName email userCode isActive')
      .sort({ code: 1 })
      .lean()
      .exec();
    return classes.map((courseClass) => ({
      ...courseClass,
      enrolled: actor.role === 'student' ? enrolledIds.includes(courseClass._id.toString()) : undefined,
      joinCode: actor.role === 'student' ? undefined : courseClass.joinCode,
    }));
  }

  async createClass(input: {
    code: string;
    name: string;
    subjectId: string;
    teacherId?: string;
    status?: ICourseClass['status'];
    allowSelfEnrollment?: boolean;
  }, adminId: string): Promise<ICourseClass> {
    const subject = await SubjectModel.findOne({ _id: input.subjectId, isActive: true }).lean().exec();
    if (!subject) throw new AppError('Active subject not found.', 404);
    await validateTeacher(input.teacherId);
    const status = input.status ?? (input.teacherId ? 'active' : 'draft');
    if (status === 'active' && !input.teacherId) throw new AppError('An active class requires a teacher.', 400);

    const code = input.code.trim().toUpperCase();
    if (await CourseClassModel.exists({ code })) throw new AppError('Class code already exists.', 409);
    const courseClass = await CourseClassModel.create({
      code,
      name: input.name.trim(),
      subjectId: input.subjectId,
      teacherId: input.teacherId,
      status,
      allowSelfEnrollment: input.allowSelfEnrollment ?? false,
      joinCode: await generateJoinCode(),
      createdBy: adminId,
    });
    if (courseClass.teacherId) {
      await this.notifyTeacherAssigned(courseClass);
    }
    return courseClass.toObject();
  }

  async updateClass(id: string, input: Partial<Pick<ICourseClass, 'code' | 'name' | 'status' | 'allowSelfEnrollment'>> & { teacherId?: string | null }): Promise<ICourseClass> {
    const courseClass = await CourseClassModel.findById(id).exec();
    if (!courseClass) throw new AppError('Class not found.', 404);
    const previousTeacherId = courseClass.teacherId?.toString();
    const previousStatus = courseClass.status;
    if (input.teacherId !== undefined) {
      await validateTeacher(input.teacherId ?? undefined);
      courseClass.teacherId = input.teacherId ? new Types.ObjectId(input.teacherId) : undefined;
    }
    if (input.code !== undefined) {
      const code = input.code.trim().toUpperCase();
      if (await CourseClassModel.exists({ code, _id: { $ne: id } })) {
        throw new AppError('Class code already exists.', 409);
      }
      courseClass.code = code;
    }
    const nextStatus = input.status ?? courseClass.status;
    if (nextStatus === 'active' && !courseClass.teacherId) throw new AppError('An active class requires a teacher.', 400);
    if (nextStatus === 'active' && !(await SubjectModel.exists({ _id: courseClass.subjectId, isActive: true }))) {
      throw new AppError('An active class requires an active subject.', 400);
    }
    if (input.name !== undefined) courseClass.name = input.name.trim();
    if (input.status !== undefined) courseClass.status = input.status;
    if (input.allowSelfEnrollment !== undefined) courseClass.allowSelfEnrollment = input.allowSelfEnrollment;
    await courseClass.save();
    const currentTeacherId = courseClass.teacherId?.toString();
    const teacherChanged = Boolean(currentTeacherId && currentTeacherId !== previousTeacherId);
    const classActivated = Boolean(currentTeacherId && previousStatus !== 'active' && courseClass.status === 'active');
    if (teacherChanged || classActivated) {
      await this.notifyTeacherAssigned(courseClass);
    }
    return courseClass.toObject();
  }

  async regenerateJoinCode(id: string): Promise<string> {
    const joinCode = await generateJoinCode();
    const result = await CourseClassModel.updateOne({ _id: id }, { joinCode }).exec();
    if (result.matchedCount === 0) throw new AppError('Class not found.', 404);
    return joinCode;
  }

  async joinClass(studentId: string, joinCode: string): Promise<void> {
    const courseClass = await CourseClassModel.findOne({
      joinCode: joinCode.trim().toUpperCase(),
      status: 'active',
      allowSelfEnrollment: true,
    }).lean().exec();
    if (!courseClass) throw new AppError('Invalid join code or self-enrollment is disabled.', 404);
    await this.upsertEnrollment(courseClass._id.toString(), studentId, 'self');
  }

  async getRoster(classId: string, actor: Actor): Promise<unknown[]> {
    const courseClass = await CourseClassModel.findById(classId).lean().exec();
    if (!courseClass) throw new AppError('Class not found.', 404);
    if (actor.role === 'teacher' && courseClass.teacherId?.toString() !== actor.id) {
      throw new AppError('Access denied.', 403);
    }
    return ClassEnrollmentModel.find({ classId, status: 'active' })
      .populate('studentId', 'username fullName email userCode isActive')
      .sort({ joinedAt: 1 })
      .lean()
      .exec();
  }

  async addStudent(classId: string, studentId: string): Promise<void> {
    const [courseClass, student] = await Promise.all([
      CourseClassModel.findById(classId).lean().exec(),
      UserModel.findOne({ _id: studentId, role: 'student', isActive: true }).lean().exec(),
    ]);
    if (!courseClass) throw new AppError('Class not found.', 404);
    if (!student) throw new AppError('Active student not found.', 404);
    const newlyEnrolled = await this.upsertEnrollment(classId, studentId, 'admin');
    if (newlyEnrolled) {
      const subject = await SubjectModel.findById(courseClass.subjectId).select('code name').lean().exec();
      if (subject) {
        await this.emailService.sendStudentEnrolled(
          { email: student.email, fullName: student.fullName },
          {
            classCode: courseClass.code,
            className: courseClass.name,
            subjectCode: subject.code,
            subjectName: subject.name,
          },
        );
      }
    }
  }

  async removeStudent(classId: string, studentId: string): Promise<void> {
    const result = await ClassEnrollmentModel.updateOne(
      { classId, studentId, status: 'active' },
      { status: 'removed', removedAt: new Date() },
    ).exec();
    if (result.modifiedCount === 0) throw new AppError('Active enrollment not found.', 404);
  }

  private async upsertEnrollment(classId: string, studentId: string, source: 'admin' | 'self'): Promise<boolean> {
    const existing = await ClassEnrollmentModel.findOne({ classId, studentId }).select('status').lean().exec();
    await ClassEnrollmentModel.findOneAndUpdate(
      { classId, studentId },
      { status: 'active', source, joinedAt: new Date(), $unset: { removedAt: 1 } },
      { upsert: true, new: true },
    ).exec();
    return !existing || existing.status !== 'active';
  }

  private async notifyTeacherAssigned(courseClass: ICourseClass): Promise<void> {
    if (!courseClass.teacherId) return;
    const [teacher, subject] = await Promise.all([
      UserModel.findOne({ _id: courseClass.teacherId, role: 'teacher', isActive: true }).select('email fullName').lean().exec(),
      SubjectModel.findById(courseClass.subjectId).select('code name').lean().exec(),
    ]);
    if (!teacher || !subject) return;
    await this.emailService.sendTeacherAssigned(
      { email: teacher.email, fullName: teacher.fullName },
      {
        classCode: courseClass.code,
        className: courseClass.name,
        subjectCode: subject.code,
        subjectName: subject.name,
      },
    );
  }
}
