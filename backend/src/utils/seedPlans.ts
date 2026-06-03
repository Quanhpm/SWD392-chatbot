import { SubscriptionPlanModel } from '../models/SubscriptionPlan.js';
import { logger } from './logger.js';

const PLANS = [
  {
    name: 'free',
    displayName: 'Miễn phí',
    price: 0,
    questionLimit: 5,
    durationDays: null,
    features: ['5 câu hỏi mỗi tài liệu', 'Truy cập tài liệu cơ bản'],
    isActive: true,
    sortOrder: 0,
  },
  {
    name: 'plus',
    displayName: 'Plus',
    price: 50000,
    questionLimit: 30,
    durationDays: 30,
    features: ['30 câu hỏi mỗi tài liệu / tháng', 'Truy cập tài liệu đầy đủ', 'AI Study Assist'],
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'pro',
    displayName: 'Pro',
    price: 100000,
    questionLimit: 100,
    durationDays: 30,
    features: ['100 câu hỏi mỗi tài liệu / tháng', 'Ưu tiên hỗ trợ', 'Tất cả tính năng Plus'],
    isActive: true,
    sortOrder: 2,
  },
];

export async function seedSubscriptionPlans(): Promise<void> {
  for (const plan of PLANS) {
    await SubscriptionPlanModel.findOneAndUpdate(
      { name: plan.name },
      { $set: plan },
      { upsert: true, new: true },
    );
  }
  logger.info('✅ Subscription plans seeded');
}
