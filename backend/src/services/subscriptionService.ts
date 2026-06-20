import { SubscriptionPlanModel, type ISubscriptionPlan } from '../models/SubscriptionPlan.js';
import { UserSubscriptionModel, type IUserSubscription } from '../models/UserSubscription.js';
import { QuestionQuotaModel } from '../models/QuestionQuota.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export interface QuotaStatus {
  allowed: boolean;
  used: number;
  limit: number;
  planName: string;
  remaining: number;
  periodKey: string;
  periodStart: Date;
  periodEnd: Date;
}

const currentUtcMonth = (date = new Date()): { periodKey: string; periodStart: Date; periodEnd: Date } => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return {
    periodKey: `${year}-${String(month + 1).padStart(2, '0')}`,
    periodStart: new Date(Date.UTC(year, month, 1)),
    periodEnd: new Date(Date.UTC(year, month + 1, 1)),
  };
};

export class SubscriptionService {
  /** Get all active plans sorted by sortOrder */
  async getPlans(): Promise<ISubscriptionPlan[]> {
    return SubscriptionPlanModel.find({ isActive: true }).sort({ sortOrder: 1 }).lean().exec();
  }

  /** Get user's active subscription. Returns null when the effective plan is Free. */
  async getUserSubscription(userId: string): Promise<IUserSubscription | null> {
    const sub = await UserSubscriptionModel.findOne({
      userId,
      status: 'active',
    }).sort({ createdAt: -1 }).lean().exec();

    if (sub?.endDate && new Date() >= new Date(sub.endDate)) {
      await UserSubscriptionModel.updateOne(
        { _id: sub._id },
        { status: 'expired' },
      );
      return null;
    }

    return sub;
  }

  /** Return the active subscription. */
  async getCurrentSubscription(userId: string): Promise<IUserSubscription | null> {
    return this.getUserSubscription(userId);
  }

  /** Get the effective plan name for a user (falls back to 'free') */
  async getEffectivePlanName(userId: string): Promise<ISubscriptionPlan['name']> {
    const sub = await this.getUserSubscription(userId);
    return sub?.planName ?? 'free';
  }

  /** Get the effective active plan definition for a user. */
  async getEffectivePlan(userId: string): Promise<ISubscriptionPlan> {
    const planName = await this.getEffectivePlanName(userId);
    const plan = await SubscriptionPlanModel.findOne({ name: planName, isActive: true }).lean().exec();
    if (plan) return plan;

    const freePlan = await SubscriptionPlanModel.findOne({ name: 'free' }).lean().exec();
    if (!freePlan) throw new AppError('Free subscription plan is not configured.', 500);
    return freePlan;
  }

  /** Subscribe immediately in demo-payment mode. */
  async subscribeToPlan(userId: string, planName: string): Promise<IUserSubscription> {
    const plan = await SubscriptionPlanModel.findOne({ name: planName, isActive: true }).lean().exec();
    if (!plan) throw new AppError('Plan not found or inactive.', 404);

    const active = await this.getUserSubscription(userId);
    const effectivePlanName = active?.planName ?? 'free';
    if (effectivePlanName === plan.name) {
      throw new AppError(`You are already using the ${plan.name} plan.`, 409);
    }

    const now = new Date();
    await UserSubscriptionModel.updateMany(
      { userId, status: { $in: ['active', 'pending'] } },
      { status: 'cancelled' },
    );

    const subscription = await UserSubscriptionModel.create({
      userId,
      planName: plan.name,
      status: 'active',
      startDate: now,
      endDate: plan.durationDays
        ? new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)
        : null,
      paymentMethod: 'demo',
    });

    return subscription.toObject();
  }

  /** Cancel current subscription */
  async cancelSubscription(userId: string): Promise<void> {
    const result = await UserSubscriptionModel.updateMany(
      { userId, status: { $in: ['active', 'pending'] } },
      { status: 'cancelled' },
    );
    if (result.modifiedCount === 0) {
      throw new AppError('No active subscription to cancel.', 404);
    }
  }

  /**
   * Check the user's account-wide quota for the current UTC calendar month.
   * This is the KEY method called before each chat message.
   */
  async checkQuota(userId: string): Promise<QuotaStatus> {
    const plan = await this.getEffectivePlan(userId);
    const planName = plan.name;
    const limit = plan.questionLimit;
    const period = currentUtcMonth();
    const quota = await QuestionQuotaModel.findOne({ userId, periodKey: period.periodKey }).lean().exec();

    const used = quota?.questionCount ?? 0;
    const remaining = Math.max(0, limit - used);

    return {
      allowed: used < limit,
      used,
      limit,
      planName,
      remaining,
      ...period,
    };
  }

  /** Atomically reserve one monthly question so parallel requests cannot exceed the plan limit. */
  async reserveQuota(userId: string): Promise<QuotaStatus> {
    const plan = await this.getEffectivePlan(userId);
    const period = currentUtcMonth();
    const now = new Date();

    try {
      await QuestionQuotaModel.updateOne(
        { userId, periodKey: period.periodKey },
        {
          $setOnInsert: {
            userId,
            periodKey: period.periodKey,
            questionCount: 0,
            periodStart: period.periodStart,
            periodEnd: period.periodEnd,
            lastQuestionAt: now,
          },
        },
        { upsert: true },
      );
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 11000)) throw error;
    }

    const quota = await QuestionQuotaModel.findOneAndUpdate(
      { userId, periodKey: period.periodKey, questionCount: { $lt: plan.questionLimit } },
      { $inc: { questionCount: 1 }, $set: { lastQuestionAt: now } },
      { new: true },
    ).lean().exec();

    if (!quota) {
      const current = await this.checkQuota(userId);
      throw new AppError(
        `Monthly question limit reached (${current.used}/${current.limit} for ${current.planName} plan).`,
        403,
      );
    }

    return {
      allowed: quota.questionCount < plan.questionLimit,
      used: quota.questionCount,
      limit: plan.questionLimit,
      planName: plan.name,
      remaining: Math.max(0, plan.questionLimit - quota.questionCount),
      ...period,
    };
  }

  /** Refund a reservation when the AI pipeline fails before returning a usable response. */
  async releaseQuota(userId: string, periodKey: string): Promise<void> {
    await QuestionQuotaModel.updateOne(
      { userId, periodKey, questionCount: { $gt: 0 } },
      { $inc: { questionCount: -1 } },
    );
  }

  /** Cron job: expire outdated subscriptions */
  async expireSubscriptions(): Promise<number> {
    const result = await UserSubscriptionModel.updateMany(
      {
        status: 'active',
        endDate: { $ne: null, $lt: new Date() },
      },
      { status: 'expired' },
    );
    if (result.modifiedCount > 0) {
      logger.info(`Expired ${result.modifiedCount} subscription(s)`);
    }
    return result.modifiedCount;
  }

  /** Monthly records roll over by periodKey; retain 13 months and remove older history. */
  async resetMonthlyQuotas(): Promise<number> {
    const retentionCutoff = new Date();
    retentionCutoff.setUTCMonth(retentionCutoff.getUTCMonth() - 13);
    const result = await QuestionQuotaModel.deleteMany({ periodEnd: { $lt: retentionCutoff } });
    if (result.deletedCount > 0) {
      logger.info(`Removed ${result.deletedCount} expired quota history record(s)`);
    }
    return result.deletedCount;
  }
}
