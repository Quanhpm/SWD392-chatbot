import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import dotenv from 'dotenv';
import mongoose, { type Model } from 'mongoose';

import { AuditLogModel } from '../models/AuditLog.js';
import { ChatSessionModel } from '../models/ChatSession.js';
import { ChunkModel } from '../models/Chunk.js';
import { DocumentModel } from '../models/Document.js';
import { EmailNotificationModel } from '../models/EmailNotification.js';
import { QuestionQuotaModel } from '../models/QuestionQuota.js';
import { SubjectAssignmentModel } from '../models/SubjectAssignment.js';
import { SubjectModel } from '../models/Subject.js';
import { SubscriptionPlanModel } from '../models/SubscriptionPlan.js';
import { UserModel } from '../models/User.js';
import { UserSubscriptionModel } from '../models/UserSubscription.js';

dotenv.config();

const apply = process.argv.includes('--apply');
const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/se1939-rag-chatbot';
type AnyModel = Model<any>;

const expectedPlans = [
  {
    name: 'free',
    displayName: 'Miễn phí',
    price: 0,
    questionLimit: 50,
    durationDays: null,
    features: ['50 câu hỏi mỗi tháng', 'Truy cập tài liệu cơ bản'],
    isActive: true,
    sortOrder: 0,
  },
  {
    name: 'plus',
    displayName: 'Plus',
    price: 50000,
    questionLimit: 300,
    durationDays: 30,
    features: ['300 câu hỏi mỗi tháng', 'Truy cập tài liệu đầy đủ', 'Hỏi đáp RAG theo tài liệu'],
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'pro',
    displayName: 'Pro',
    price: 100000,
    questionLimit: 1000,
    durationDays: 30,
    features: ['1000 câu hỏi mỗi tháng', 'Ưu tiên hỗ trợ', 'Tất cả tính năng Plus'],
    isActive: true,
    sortOrder: 2,
  },
];

const utcMonthFor = (date = new Date()): { periodKey: string; periodStart: Date; periodEnd: Date } => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return {
    periodKey: `${year}-${String(month + 1).padStart(2, '0')}`,
    periodStart: new Date(Date.UTC(year, month, 1)),
    periodEnd: new Date(Date.UTC(year, month + 1, 1)),
  };
};

const summarizeCollections = async () => {
  const db = mongoose.connection.db!;
  const collections = await db.listCollections().toArray();
  const result: Record<string, { count: number; indexes: Array<{ name: string; key: Record<string, unknown>; unique: boolean }> }> = {};

  for (const collection of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    const handle = db.collection(collection.name);
    result[collection.name] = {
      count: await handle.estimatedDocumentCount(),
      indexes: (await handle.indexes()).map((index) => ({
        name: index.name ?? '',
        key: index.key,
        unique: Boolean(index.unique),
      })),
    };
  }

  return result;
};

const writeBackup = async (): Promise<string> => {
  const db = mongoose.connection.db!;
  const collections = await db.listCollections().toArray();
  const backup: Record<string, unknown> = {
    database: db.databaseName,
    createdAt: new Date().toISOString(),
    collections: {},
  };

  for (const collection of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    const handle = db.collection(collection.name);
    (backup.collections as Record<string, unknown>)[collection.name] = {
      indexes: await handle.indexes(),
      documents: await handle.find({}).toArray(),
    };
  }

  const directory = path.join(os.tmpdir(), 'se1939-rag-chatbot-db-backups');
  await fs.mkdir(directory, { recursive: true });
  const filename = `subject-only-fix-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filePath = path.join(directory, filename);
  await fs.writeFile(filePath, JSON.stringify(backup, null, 2), 'utf8');
  return filePath;
};

const ensureCollectionAndIndexes = async (models: AnyModel[]) => {
  const synced: Record<string, unknown> = {};
  for (const model of models) {
    await model.createCollection();
    synced[model.collection.name] = await model.syncIndexes();
  }
  return synced;
};

const migrateLegacyQuotas = async () => {
  const db = mongoose.connection.db!;
  const quotas = db.collection('questionquotas');
  const now = new Date();
  const currentPeriod = utcMonthFor(now);
  const legacy = await quotas.find({
    $or: [
      { periodKey: { $exists: false } },
      { periodKey: null },
      { documentId: { $exists: true } },
    ],
  }).toArray();

  const grouped = new Map<string, { userId: unknown; count: number; lastQuestionAt: Date }>();
  for (const item of legacy) {
    const key = String(item.userId);
    const existing = grouped.get(key) ?? { userId: item.userId, count: 0, lastQuestionAt: now };
    existing.count += Number(item.questionCount ?? 0);
    existing.lastQuestionAt = item.lastQuestionAt instanceof Date ? item.lastQuestionAt : now;
    grouped.set(key, existing);
  }

  if (!apply) {
    return { legacyDocuments: legacy.length, usersToRollUp: grouped.size };
  }

  if (legacy.length > 0) {
    await quotas.deleteMany({ _id: { $in: legacy.map((item) => item._id) } });
    for (const item of grouped.values()) {
      await quotas.updateOne(
        { userId: item.userId, periodKey: currentPeriod.periodKey },
        {
          $inc: { questionCount: item.count },
          $setOnInsert: {
            userId: item.userId,
            periodKey: currentPeriod.periodKey,
            periodStart: currentPeriod.periodStart,
            periodEnd: currentPeriod.periodEnd,
          },
          $set: { lastQuestionAt: item.lastQuestionAt },
          $unset: { documentId: 1 },
        },
        { upsert: true },
      );
    }
  }

  await quotas.updateMany({}, { $unset: { documentId: 1 } });
  return { legacyDocuments: legacy.length, usersRolledUp: grouped.size };
};

const fixDatabase = async () => {
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  const before = await summarizeCollections();
  const legacyUserFields = await UserModel.countDocuments({ enrolledSubjects: { $exists: true } }).exec();
  const legacyDocumentFields = await DocumentModel.countDocuments({
    $or: [
      { visibility: { $exists: true } },
      { classIds: { $exists: true } },
      { reviewedBy: { $exists: true } },
      { reviewedAt: { $exists: true } },
      { rejectionReason: { $exists: true } },
    ],
  }).exec();
  const planDiff = await SubscriptionPlanModel.find({
    $or: expectedPlans.map((plan) => ({ name: plan.name, questionLimit: { $ne: plan.questionLimit } })),
  }).select('name questionLimit').lean().exec();
  const quotaMigration = await migrateLegacyQuotas();

  const report: Record<string, unknown> = {
    mode: apply ? 'apply' : 'dry-run',
    database: db.databaseName,
    before,
    planned: {
      legacyUsersWithEnrolledSubjects: legacyUserFields,
      legacyDocumentsWithRemovedFields: legacyDocumentFields,
      subscriptionPlansToUpdate: planDiff,
      quotaMigration,
      ensureCollections: ['emailnotifications', 'auditlogs'],
      syncIndexes: [
        'users',
        'subjects',
        'subjectassignments',
        'documents',
        'chunks',
        'chatsessions',
        'subscriptionplans',
        'usersubscriptions',
        'questionquotas',
        'emailnotifications',
        'auditlogs',
      ],
    },
  };

  if (!apply) {
    return report;
  }

  const backupPath = await writeBackup();
  const [usersUnset, documentsUnset] = await Promise.all([
    db.collection('users').updateMany(
      { enrolledSubjects: { $exists: true } },
      { $unset: { enrolledSubjects: 1 } },
    ),
    db.collection('documents').updateMany(
      {},
      {
        $unset: {
          visibility: 1,
          classIds: 1,
          reviewedBy: 1,
          reviewedAt: 1,
          rejectionReason: 1,
        },
      },
    ),
  ]);

  for (const plan of expectedPlans) {
    await SubscriptionPlanModel.findOneAndUpdate(
      { name: plan.name },
      { $set: plan },
      { upsert: true, new: true },
    ).exec();
  }

  const syncedIndexes = await ensureCollectionAndIndexes([
    UserModel,
    SubjectModel,
    SubjectAssignmentModel,
    DocumentModel,
    ChunkModel,
    ChatSessionModel,
    SubscriptionPlanModel,
    UserSubscriptionModel,
    QuestionQuotaModel,
    EmailNotificationModel,
    AuditLogModel,
  ]);

  return {
    ...report,
    backupPath,
    applied: {
      usersUnset,
      documentsUnset,
      syncedIndexes,
    },
    after: await summarizeCollections(),
  };
};

void fixDatabase()
  .then((report) => {
    console.log(JSON.stringify(report, null, 2));
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
