import { Schema, model, type HydratedDocument } from 'mongoose';

export interface ISubscriptionPlan {
  name: 'free' | 'plus' | 'pro';
  displayName: string;
  price: number;
  questionLimit: number;
  durationDays: number | null; // null = permanent (Free only)
  features: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

export type SubscriptionPlanDocument = HydratedDocument<ISubscriptionPlan>;

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ['free', 'plus', 'pro'],
    },
    displayName: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    questionLimit: { type: Number, required: true, min: 1 },
    durationDays: { type: Number, default: null },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

export const SubscriptionPlanModel = model<ISubscriptionPlan>('SubscriptionPlan', subscriptionPlanSchema);
