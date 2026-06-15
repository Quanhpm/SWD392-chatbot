import api from './api.js';
import type { IUser, UserRole } from '../types/index.js';

export interface AdminSummary {
  users: number;
  subjects: number;
  classes: number;
  pendingDocuments: number;
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
