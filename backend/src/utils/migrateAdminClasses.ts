import mongoose, { Types } from 'mongoose';

import { connectDatabase } from '../config/database.js';
import { ClassEnrollmentModel } from '../models/ClassEnrollment.js';
import { CourseClassModel } from '../models/CourseClass.js';
import { DocumentModel } from '../models/Document.js';
import { SubjectModel } from '../models/Subject.js';
import { UserModel } from '../models/User.js';
import { seedInitialAdmin } from './seedAdmin.js';

interface MigrationReport {
  usersBackfilled: number;
  subjectsBackfilled: number;
  classesCreated: number;
  enrollmentsCreated: number;
  documentsApproved: number;
  documentsRequeued: number;
  subscriptionsActivated: number;
  draftSubjects: string[];
  unmappedEnrollments: { studentId: string; subjectId: string }[];
}

const codeFrom = (value: string, fallback: string): string => {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 14);
  return cleaned || fallback;
};

const uniqueSubjectCode = async (base: string, id: Types.ObjectId): Promise<string> => {
  const subjects = mongoose.connection.collection('subjects');
  let candidate = base;
  let counter = 1;
  while (await subjects.findOne({ code: candidate, _id: { $ne: id } })) {
    candidate = `${base.slice(0, 15)}-${counter}`;
    counter += 1;
  }
  return candidate;
};

export async function migrateAdminClasses(dryRun = false): Promise<MigrationReport> {
  const report: MigrationReport = {
    usersBackfilled: 0,
    subjectsBackfilled: 0,
    classesCreated: 0,
    enrollmentsCreated: 0,
    documentsApproved: 0,
    documentsRequeued: 0,
    subscriptionsActivated: 0,
    draftSubjects: [],
    unmappedEnrollments: [],
  };

  if (!dryRun) await seedInitialAdmin();

  const users = mongoose.connection.collection('users');
  const subjects = mongoose.connection.collection('subjects');
  const classes = mongoose.connection.collection('classes');
  const enrollments = mongoose.connection.collection('classenrollments');
  const documents = mongoose.connection.collection('documents');
  const subscriptions = mongoose.connection.collection('usersubscriptions');

  const admin = await users.findOne({ role: 'admin', isActive: { $ne: false } });
  if (!admin && !dryRun) throw new Error('An active admin is required. Configure ADMIN_* environment variables first.');

  const legacyUsers = await users.find({}).toArray();
  for (const user of legacyUsers) {
    const suffix = user._id.toString().slice(-6).toUpperCase();
    const updates: Record<string, unknown> = {};
    if (!user.fullName) updates.fullName = user.username;
    if (!user.email) updates.email = `${String(user.username).toLowerCase()}.${suffix.toLowerCase()}@legacy.local`;
    if (!user.userCode) updates.userCode = `${String(user.role).slice(0, 3).toUpperCase()}${suffix}`;
    if (user.isActive === undefined) updates.isActive = true;
    if (Object.keys(updates).length > 0) {
      report.usersBackfilled += 1;
      if (!dryRun) await users.updateOne({ _id: user._id }, { $set: updates });
    }
  }

  const legacySubjects = await subjects.find({}).toArray();
  const defaultClassBySubject = new Map<string, Types.ObjectId>();
  for (const subject of legacySubjects) {
    const subjectCode = await uniqueSubjectCode(
      subject.code || codeFrom(String(subject.name), `SUBJ-${subject._id.toString().slice(-6)}`),
      subject._id,
    );
    const updates: Record<string, unknown> = {};
    if (!subject.code) updates.code = subjectCode;
    if (subject.isActive === undefined) updates.isActive = true;
    if (!subject.createdBy && admin) updates.createdBy = admin._id;
    if (Object.keys(updates).length > 0 || subject.password || subject.teacherId) {
      report.subjectsBackfilled += 1;
      if (!dryRun) {
        await subjects.updateOne(
          { _id: subject._id },
          { $set: updates, $unset: { password: '', teacherId: '' } },
        );
      }
    }

    const classCode = `${subjectCode}-DEFAULT`.slice(0, 30);
    let defaultClass = await classes.findOne({ code: classCode });
    if (!defaultClass) {
      const teacher = subject.teacherId
        ? await users.findOne({ _id: subject.teacherId, role: 'teacher', isActive: { $ne: false } })
        : null;
      const classId = new Types.ObjectId();
      const status = teacher ? 'active' : 'draft';
      if (!teacher) report.draftSubjects.push(String(subject.name));
      report.classesCreated += 1;
      if (!dryRun) {
        await classes.insertOne({
          _id: classId,
          code: classCode,
          name: `${subject.name} - Default Class`,
          subjectId: subject._id,
          teacherId: teacher?._id,
          status,
          allowSelfEnrollment: true,
          joinCode: `L${subject._id.toString().slice(-7)}`.toUpperCase(),
          createdBy: admin?._id ?? teacher?._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      defaultClass = { _id: classId };
    }
    defaultClassBySubject.set(subject._id.toString(), defaultClass._id as Types.ObjectId);
  }

  for (const user of legacyUsers) {
    if (user.role !== 'student' || !Array.isArray(user.enrolledSubjects)) continue;
    let hasUnmappedEnrollment = false;
    for (const subjectId of user.enrolledSubjects as Types.ObjectId[]) {
      const classId = defaultClassBySubject.get(subjectId.toString());
      if (!classId) {
        hasUnmappedEnrollment = true;
        report.unmappedEnrollments.push({ studentId: user._id.toString(), subjectId: subjectId.toString() });
        continue;
      }
      if (!(await enrollments.findOne({ classId, studentId: user._id }))) {
        report.enrollmentsCreated += 1;
        if (!dryRun) {
          await enrollments.insertOne({
            classId,
            studentId: user._id,
            source: 'admin',
            status: 'active',
            joinedAt: new Date(),
          });
        }
      }
    }
    if (!dryRun && user.enrolledSubjects !== undefined && !hasUnmappedEnrollment) {
      await users.updateOne({ _id: user._id }, { $unset: { enrolledSubjects: '' } });
    }
  }

  report.documentsApproved = await documents.countDocuments({ status: 'indexed' });
  report.documentsRequeued = await documents.countDocuments({ status: 'processing' });
  report.subscriptionsActivated = await subscriptions.countDocuments({ status: 'pending' });
  if (!dryRun) {
    await documents.updateMany({ status: 'indexed' }, { $set: { status: 'approved' } });
    await documents.updateMany({ status: 'processing' }, { $set: { status: 'uploaded' } });
    await subscriptions.updateMany(
      { status: 'pending' },
      { $set: { status: 'active', paymentMethod: 'demo', startDate: new Date() } },
    );
    await Promise.all([
      UserModel.createIndexes(),
      SubjectModel.createIndexes(),
      CourseClassModel.createIndexes(),
      ClassEnrollmentModel.createIndexes(),
      DocumentModel.createIndexes(),
    ]);
  }

  return report;
}

const isDirectRun = process.argv[1]?.endsWith('migrateAdminClasses.ts');
if (isDirectRun) {
  const dryRun = process.argv.includes('--dry-run');
  void connectDatabase()
    .then(() => migrateAdminClasses(dryRun))
    .then((report) => {
      console.log(JSON.stringify({ dryRun, report }, null, 2));
    })
    .finally(async () => mongoose.disconnect());
}
