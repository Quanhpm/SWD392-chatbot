import { SubscriptionPlanModel } from '../models/SubscriptionPlan.js';
import { logger } from './logger.js';

const PLANS = [
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
    features: ['300 câu hỏi mỗi tháng', 'Truy cập tài liệu đầy đủ', 'AI Study Assist'],
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
