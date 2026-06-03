import { SubscriptionPlanModel, type ISubscriptionPlan } from '../models/SubscriptionPlan.js';
import { UserSubscriptionModel, type IUserSubscription } from '../models/UserSubscription.js';
import { QuestionQuotaModel, type IQuestionQuota } from '../models/QuestionQuota.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export interface QuotaStatus {
  allowed: boolean;
  used: number;
  limit: number;
  planName: string;
  remaining: number;
}

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

  /** Return a pending request when present, otherwise the active subscription. */
  async getCurrentSubscription(userId: string): Promise<IUserSubscription | null> {
    const pending = await UserSubscriptionModel.findOne({
      userId,
      status: 'pending',
    }).sort({ createdAt: -1 }).lean().exec();

    return pending ?? this.getUserSubscription(userId);
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

  /** Subscribe to a plan. For paid plans, status is 'pending' until approved. */
  async subscribeToPlan(userId: string, planName: string): Promise<IUserSubscription> {
    const plan = await SubscriptionPlanModel.findOne({ name: planName, isActive: true }).lean().exec();
    if (!plan) throw new AppError('Plan not found or inactive.', 404);

    const pending = await UserSubscriptionModel.findOne({
      userId,
      status: 'pending',
    }).lean().exec();

    if (pending) {
      throw new AppError(
        `You already have a pending subscription (${pending.planName}). Cancel it first.`,
        409,
      );
    }

    const active = await this.getUserSubscription(userId);
    const effectivePlanName = active?.planName ?? 'free';
    if (effectivePlanName === plan.name) {
      throw new AppError(`You are already using the ${plan.name} plan.`, 409);
    }

    const now = new Date();
    const isPaid = plan.price > 0;

    if (!isPaid) {
      await UserSubscriptionModel.updateMany(
        { userId, status: 'active' },
        { status: 'cancelled' },
      );
    }

    const subscription = await UserSubscriptionModel.create({
      userId,
      planName: plan.name,
      status: isPaid ? 'pending' : 'active',
      startDate: now,
      endDate: plan.durationDays
        ? new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)
        : null,
      paymentMethod: 'manual',
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

  /** Admin: list pending subscriptions */
  async listPendingSubscriptions(): Promise<IUserSubscription[]> {
    return UserSubscriptionModel.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('userId', 'username role')
      .lean()
      .exec();
  }

  /** Admin: approve a pending subscription */
  async approveSubscription(subscriptionId: string, adminId: string): Promise<IUserSubscription> {
    const sub = await UserSubscriptionModel.findById(subscriptionId).exec();
    if (!sub) throw new AppError('Subscription not found.', 404);
    if (sub.status !== 'pending') throw new AppError('Subscription is not pending.', 400);

    const plan = await SubscriptionPlanModel.findOne({ name: sub.planName }).lean().exec();
    if (!plan) throw new AppError('Subscription plan is not configured.', 500);

    const now = new Date();
    const endDate = plan.durationDays
      ? new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)
      : null;

    await UserSubscriptionModel.updateMany(
      { userId: sub.userId, status: 'active', _id: { $ne: sub._id } },
      { status: 'cancelled' },
    );

    sub.status = 'active';
    sub.startDate = now;
    sub.endDate = endDate;
    sub.approvedBy = adminId as any;
    await sub.save();

    await QuestionQuotaModel.updateMany(
      { userId: sub.userId },
      {
        questionCount: 0,
        periodStart: now,
        periodEnd: endDate,
      },
    );

    return sub.toObject();
  }

  /** Admin: reject a pending subscription */
  async rejectSubscription(subscriptionId: string): Promise<void> {
    const result = await UserSubscriptionModel.updateOne(
      { _id: subscriptionId, status: 'pending' },
      { status: 'cancelled' },
    );
    if (result.modifiedCount === 0) {
      throw new AppError('Subscription not found or not pending.', 404);
    }
  }

  /**
   * Check if user has remaining quota for a document.
   * This is the KEY method called before each chat message.
   */
  async checkQuota(userId: string, documentId: string): Promise<QuotaStatus> {
    const activeSubscription = await this.getUserSubscription(userId);
    const plan = await this.getEffectivePlan(userId);
    const planName = plan.name;
    const limit = plan.questionLimit;

    const now = new Date();
    const quota = await QuestionQuotaModel.findOne({ userId, documentId }).exec();

    if (!quota) {
      return {
        allowed: true,
        used: 0,
        limit,
        planName,
        remaining: limit,
      };
    }

    if (activeSubscription && (
      quota.periodStart < activeSubscription.startDate
      || quota.periodEnd?.getTime() !== activeSubscription.endDate?.getTime()
    )) {
      quota.questionCount = 0;
      quota.periodStart = activeSubscription.startDate;
      quota.periodEnd = activeSubscription.endDate;
      await quota.save();
    } else if (quota.periodEnd && now >= quota.periodEnd) {
      quota.questionCount = 0;
      quota.periodStart = now;
      quota.periodEnd = null;
      await quota.save();
    }

    const used = quota.questionCount;
    const remaining = Math.max(0, limit - used);

    return {
      allowed: used < limit,
      used,
      limit,
      planName,
      remaining,
    };
  }

  /** Increment question count after a successful answer */
  async incrementQuota(userId: string, documentId: string): Promise<void> {
    const activeSubscription = await this.getUserSubscription(userId);
    const now = new Date();

    await QuestionQuotaModel.findOneAndUpdate(
      { userId, documentId },
      {
        $inc: { questionCount: 1 },
        $set: { lastQuestionAt: now },
        $setOnInsert: {
          periodStart: activeSubscription?.startDate ?? now,
          periodEnd: activeSubscription?.endDate ?? null,
        },
      },
      { upsert: true, new: true },
    );
  }

  /** Get quota usage for all documents for a user */
  async getQuotaUsage(userId: string): Promise<IQuestionQuota[]> {
    return QuestionQuotaModel.find({ userId, documentId: { $exists: true } })
      .populate('documentId', 'originalName subject chapter chapterTitle')
      .lean()
      .exec();
  }

  /** Get quota for a specific document */
  async getDocumentQuota(userId: string, documentId: string): Promise<QuotaStatus> {
    return this.checkQuota(userId, documentId);
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

  /** Reset elapsed paid-plan quota windows. Expired subscriptions then fall back to Free. */
  async resetMonthlyQuotas(): Promise<number> {
    const now = new Date();
    const result = await QuestionQuotaModel.updateMany(
      { periodEnd: { $ne: null, $lte: now } },
      {
        questionCount: 0,
        periodStart: now,
        periodEnd: null,
      },
    );
    if (result.modifiedCount > 0) {
      logger.info(`Reset ${result.modifiedCount} quota record(s)`);
    }
    return result.modifiedCount;
  }
}
