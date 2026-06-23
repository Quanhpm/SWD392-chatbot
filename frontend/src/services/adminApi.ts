import api from './api.js';
import type { IAuditLog, IEmailNotification, IUser, UserRole } from '../types/index.js';

export interface AdminSummary {
  users: number;
  subjects: number;
  assignments: number;
  processingDocuments: number;
  queuedEmails: number;
  failedEmails: number;
}

export const getSummary = async (): Promise<AdminSummary> => {
  const response = await api.get<{ success: boolean; summary: AdminSummary }>('/admin/summary');
  return response.data.summary;
};

export const getUsers = async (filters?: { role?: UserRole; status?: 'active' | 'inactive'; search?: string }): Promise<IUser[]> => {
  const response = await api.get<{ success: boolean; users: IUser[] }>('/admin/users', { params: filters });
  return response.data.users;
};

export const createUser = async (input: {
  username: string;
  password: string;
  role: UserRole;
  fullName: string;
  email: string;
  userCode: string;
}): Promise<IUser> => {
  const response = await api.post<{ success: boolean; user: IUser }>('/admin/users', input);
  return response.data.user;
};

export const updateUser = async (id: string, input: Partial<Pick<IUser, 'fullName' | 'email' | 'userCode'>>): Promise<IUser> => {
  const response = await api.patch<{ success: boolean; user: IUser }>(`/admin/users/${id}`, input);
  return response.data.user;
};

export const resetPassword = async (id: string, password: string): Promise<void> => {
  await api.patch(`/admin/users/${id}/password`, { password });
};

export const deactivateUser = async (id: string): Promise<void> => {
  await api.delete(`/admin/users/${id}`);
};

export const activateUser = async (id: string): Promise<void> => {
  await api.post(`/admin/users/${id}/activate`);
};

export const getEmailNotifications = async (filters?: {
  status?: IEmailNotification['status'];
  limit?: number;
}): Promise<IEmailNotification[]> => {
  const response = await api.get<{ success: boolean; notifications: IEmailNotification[] }>('/admin/email-notifications', { params: filters });
  return response.data.notifications;
};

export const retryEmailNotification = async (id: string): Promise<IEmailNotification> => {
  const response = await api.post<{ success: boolean; notification: IEmailNotification }>(`/admin/email-notifications/${id}/retry`);
  return response.data.notification;
};

export const getAuditLogs = async (limit = 100): Promise<IAuditLog[]> => {
  const response = await api.get<{ success: boolean; logs: IAuditLog[] }>('/admin/audit-logs', { params: { limit } });
  return response.data.logs;
};
