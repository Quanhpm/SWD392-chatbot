import mongoose, { Types } from 'mongoose';

import { connectDatabase } from '../config/database.js';
import { SubjectAssignmentModel } from '../models/SubjectAssignment.js';
import { logger } from './logger.js';

interface MigrationReport {
  assignmentsCreated: number;
  documentSubjectIdsBackfilled: number;
  documentsReady: number;
  documentsFailed: number;
  documentLegacyFieldsRemoved: number;
  legacyChatSessionsArchived: number;
  learningAssistRecordsArchived: number;
  legacyClassesArchived: number;
  legacyEnrollmentsArchived: number;
}

const collectionExists = async (name: string): Promise<boolean> =>
  Boolean((await mongoose.connection.db!.listCollections({ name }).toArray()).length);

export async function migrateSubjectOnly(dryRun = false): Promise<MigrationReport> {
  const db = mongoose.connection.db!;
  const documents = db.collection('documents');
  const subjects = db.collection('subjects');
  const users = db.collection('users');
  const chunks = db.collection('chunks');
  const chats = db.collection('chatsessions');

  const admin = await users.findOne({ role: 'admin', isActive: true });
  const subjectList = await subjects.find({}).toArray();
  const subjectByName = new Map(subjectList.map((subject) => [String(subject.name), subject._id as Types.ObjectId]));

  let assignmentsCreated = 0;
  let legacyClassesArchived = 0;
  if (admin && await collectionExists('classes')) {
    const classes = db.collection('classes');
    const legacyClasses = await classes.find({ status: 'active', teacherId: { $exists: true } }).toArray();
    for (const legacy of legacyClasses) {
      const exists = await SubjectAssignmentModel.exists({ subjectId: legacy.subjectId, teacherId: legacy.teacherId });
      if (!exists) assignmentsCreated += 1;
      if (dryRun) continue;
      const result = await SubjectAssignmentModel.updateOne(
        { subjectId: legacy.subjectId, teacherId: legacy.teacherId },
        {
          $setOnInsert: {
            subjectId: legacy.subjectId,
            teacherId: legacy.teacherId,
            assignedBy: legacy.createdBy ?? admin._id,
            assignedAt: legacy.createdAt ?? new Date(),
          },
          $set: { status: 'active' },
          $unset: { removedAt: 1 },
        },
        { upsert: true },
      );
      void result;
    }

    const legacyClassArchiveQuery = { subjectOnlyArchivedAt: { $exists: false } };
    legacyClassesArchived = await classes.countDocuments(legacyClassArchiveQuery);
    if (!dryRun && legacyClassesArchived > 0) {
      await classes.updateMany(legacyClassArchiveQuery, { $set: { subjectOnlyArchivedAt: new Date() } });
    }
  }

  let documentSubjectIdsBackfilled = 0;
  let documentsReady = 0;
  let documentsFailed = 0;
  const legacyDocuments = await documents.find({}).toArray();
  let documentLegacyFieldsRemoved = 0;
  for (const document of legacyDocuments) {
    const updateSet: Record<string, unknown> = {};
    if (!document.subjectId && document.subject && subjectByName.has(String(document.subject))) {
      updateSet.subjectId = subjectByName.get(String(document.subject));
      documentSubjectIdsBackfilled += 1;
    }
    if (!['uploaded', 'processing', 'ready', 'failed'].includes(String(document.status))) {
      const chunkCount = await chunks.countDocuments({ documentId: document._id });
      if (chunkCount > 0) {
        updateSet.status = 'ready';
        updateSet.totalChunks = chunkCount;
        documentsReady += 1;
      } else {
        updateSet.status = 'failed';
        updateSet.errorMessage = document.errorMessage ?? 'Legacy document has no indexed chunks.';
        documentsFailed += 1;
      }
    }
    if (['visibility', 'classIds', 'reviewedBy', 'reviewedAt', 'rejectionReason'].some((field) => document[field] !== undefined)) {
      documentLegacyFieldsRemoved += 1;
    }
    if (!dryRun) await documents.updateOne(
      { _id: document._id },
      {
        ...(Object.keys(updateSet).length > 0 ? { $set: updateSet } : {}),
        $unset: {
          visibility: 1,
          classIds: 1,
          reviewedBy: 1,
          reviewedAt: 1,
          rejectionReason: 1,
        },
      },
    );
  }

  const legacyChatQuery = {
    $or: [{ documentId: { $exists: false } }, { documentId: null }],
    subjectOnlyArchivedAt: { $exists: false },
  };
  const legacyChatSessionsArchived = await chats.countDocuments(legacyChatQuery);
  if (!dryRun && legacyChatSessionsArchived > 0) {
    await chats.updateMany(legacyChatQuery, { $set: { subjectOnlyArchivedAt: new Date() } });
  }

  let learningAssistRecordsArchived = 0;
  if (await collectionExists('documentassists')) {
    const assists = db.collection('documentassists');
    const assistQuery = { subjectOnlyArchivedAt: { $exists: false } };
    learningAssistRecordsArchived = await assists.countDocuments(assistQuery);
    if (!dryRun && learningAssistRecordsArchived > 0) {
      await assists.updateMany(assistQuery, { $set: { subjectOnlyArchivedAt: new Date() } });
    }
  }

  let legacyEnrollmentsArchived = 0;
  if (await collectionExists('classenrollments')) {
    const enrollments = db.collection('classenrollments');
    const enrollmentQuery = { subjectOnlyArchivedAt: { $exists: false } };
    legacyEnrollmentsArchived = await enrollments.countDocuments(enrollmentQuery);
    if (!dryRun && legacyEnrollmentsArchived > 0) {
      await enrollments.updateMany(enrollmentQuery, { $set: { subjectOnlyArchivedAt: new Date() } });
    }
  }

  const report: MigrationReport = {
    assignmentsCreated,
    documentSubjectIdsBackfilled,
    documentsReady,
    documentsFailed,
    documentLegacyFieldsRemoved,
    legacyChatSessionsArchived,
    learningAssistRecordsArchived,
    legacyClassesArchived,
    legacyEnrollmentsArchived,
  };
  if (Object.values(report).some((value) => value > 0)) logger.info(`Subject-only migration${dryRun ? ' dry-run' : ''}: ${JSON.stringify(report)}`);
  return report;
}

const isDirectRun = process.argv[1]?.endsWith('migrateSubjectOnly.ts');
if (isDirectRun) {
  const dryRun = process.argv.includes('--dry-run');
  void connectDatabase()
    .then(() => migrateSubjectOnly(dryRun))
    .then((report) => console.log(JSON.stringify(report, null, 2)))
    .finally(async () => mongoose.disconnect());
}
