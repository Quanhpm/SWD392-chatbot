import api from './api.js';
import type { ISubscriptionPlan, IUserSubscription, IQuotaStatus, IQuotaUsage } from '../types/index.js';

export const getPlans = async (): Promise<ISubscriptionPlan[]> => {
  const response = await api.get<{ success: boolean; plans: ISubscriptionPlan[] }>('/subscriptions/plans');
  return response.data.plans;
};

export const getMySubscription = async (): Promise<{ subscription: IUserSubscription | null; plan: ISubscriptionPlan }> => {
  const response = await api.get<{ success: boolean; subscription: IUserSubscription | null; plan: ISubscriptionPlan }>('/subscriptions/me');
  return response.data;
};

export const subscribeToPlan = async (planName: string): Promise<IUserSubscription> => {
  const response = await api.post<{ success: boolean; subscription: IUserSubscription }>('/subscriptions/subscribe', { planName });
  return response.data.subscription;
};

export const cancelSubscription = async (): Promise<string> => {
  const response = await api.post<{ success: boolean; message: string }>('/subscriptions/cancel');
  return response.data.message;
};

export const getQuotaUsage = async (): Promise<IQuotaUsage[]> => {
  const response = await api.get<{ success: boolean; usage: IQuotaUsage[] }>('/subscriptions/quota');
  return response.data.usage;
};

export const getDocumentQuota = async (documentId: string): Promise<IQuotaStatus> => {
  const response = await api.get<{ success: boolean; quota: IQuotaStatus }>(`/subscriptions/quota/${documentId}`);
  return response.data.quota;
};
