import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface IUserSubscription {
  userId: Types.ObjectId;
  planName: 'free' | 'plus' | 'pro';
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  startDate: Date;
  endDate: Date | null;
  paymentMethod: string;
  paymentReference?: string;
  approvedBy?: Types.ObjectId;
  createdAt: Date;
}

export type UserSubscriptionDocument = HydratedDocument<IUserSubscription>;

const userSubscriptionSchema = new Schema<IUserSubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planName: {
      type: String,
      required: true,
      enum: ['free', 'plus', 'pro'],
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'active', 'expired', 'cancelled'],
      default: 'pending',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    paymentMethod: { type: String, default: 'manual' },
    paymentReference: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

userSubscriptionSchema.index({ userId: 1, status: 1 });
userSubscriptionSchema.index({ endDate: 1 });
userSubscriptionSchema.index({ status: 1, createdAt: -1 });

export const UserSubscriptionModel = model<IUserSubscription>('UserSubscription', userSubscriptionSchema);
