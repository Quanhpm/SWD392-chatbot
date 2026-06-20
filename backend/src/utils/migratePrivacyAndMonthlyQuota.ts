import mongoose, { Types } from 'mongoose';

import { connectDatabase } from '../config/database.js';
import { logger } from './logger.js';

interface MigrationReport {
  documentsBackfilled: number;
  legacyQuotaRecordsRemoved: number;
  monthlyQuotaRecordsCreated: number;
  legacyQuotaIndexesDropped: number;
}

const currentUtcMonth = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return {
    periodKey: `${year}-${String(month + 1).padStart(2, '0')}`,
    periodStart: new Date(Date.UTC(year, month, 1)),
    periodEnd: new Date(Date.UTC(year, month + 1, 1)),
  };
};

/**
 * Makes the privacy/quota schema change safe for existing databases.
 * Legacy documents are intentionally treated as subject-wide. Legacy per-document
 * usage is aggregated only when the last question was asked in the current month.
 */
export async function migratePrivacyAndMonthlyQuota(): Promise<MigrationReport> {
  const documents = mongoose.connection.collection('documents');
  const quotas = mongoose.connection.collection('questionquotas');
  const period = currentUtcMonth();

  const documentResult = await documents.updateMany(
    { visibility: { $exists: false } },
    { $set: { visibility: 'subject-wide', classIds: [] } },
  );

  const legacyQuotas = await quotas.find({
    $or: [
      { periodKey: { $exists: false } },
      { documentId: { $exists: true } },
    ],
  }).toArray();

  const currentUsageByUser = new Map<string, { userId: Types.ObjectId; count: number; lastQuestionAt: Date }>();
  for (const quota of legacyQuotas) {
    const lastQuestionAt = quota.lastQuestionAt instanceof Date ? quota.lastQuestionAt : new Date(quota.lastQuestionAt ?? 0);
    if (lastQuestionAt < period.periodStart || lastQuestionAt >= period.periodEnd || !quota.userId) continue;
    const key = quota.userId.toString();
    const existing = currentUsageByUser.get(key);
    currentUsageByUser.set(key, {
      userId: quota.userId as Types.ObjectId,
      count: (existing?.count ?? 0) + Math.max(0, Number(quota.questionCount) || 0),
      lastQuestionAt: existing && existing.lastQuestionAt > lastQuestionAt ? existing.lastQuestionAt : lastQuestionAt,
    });
  }

  if (legacyQuotas.length > 0) {
    await quotas.deleteMany({ _id: { $in: legacyQuotas.map((quota) => quota._id) } });
  }

  if (currentUsageByUser.size > 0) {
    await quotas.bulkWrite(
      [...currentUsageByUser.values()].map((usage) => ({
        updateOne: {
          filter: { userId: usage.userId, periodKey: period.periodKey },
          update: {
            $inc: { questionCount: usage.count },
            $max: { lastQuestionAt: usage.lastQuestionAt },
            $setOnInsert: {
              userId: usage.userId,
              periodKey: period.periodKey,
              periodStart: period.periodStart,
              periodEnd: period.periodEnd,
            },
          },
          upsert: true,
        },
      })),
    );
  }

  let legacyQuotaIndexesDropped = 0;
  const collectionExists = (await mongoose.connection.db?.listCollections({ name: 'questionquotas' }).toArray())?.length;
  if (collectionExists) {
    const indexes = await quotas.indexes();
    for (const index of indexes) {
      if (index.name !== '_id_' && Object.prototype.hasOwnProperty.call(index.key, 'documentId')) {
        await quotas.dropIndex(index.name!);
        legacyQuotaIndexesDropped += 1;
      }
    }
  }

  const report = {
    documentsBackfilled: documentResult.modifiedCount,
    legacyQuotaRecordsRemoved: legacyQuotas.length,
    monthlyQuotaRecordsCreated: currentUsageByUser.size,
    legacyQuotaIndexesDropped,
  };
  if (Object.values(report).some((value) => value > 0)) {
    logger.info(`Privacy/monthly quota migration: ${JSON.stringify(report)}`);
  }
  return report;
}

const isDirectRun = process.argv[1]?.endsWith('migratePrivacyAndMonthlyQuota.ts');
if (isDirectRun) {
  void connectDatabase()
    .then(() => migratePrivacyAndMonthlyQuota())
    .then((report) => console.log(JSON.stringify(report, null, 2)))
    .finally(async () => mongoose.disconnect());
}
