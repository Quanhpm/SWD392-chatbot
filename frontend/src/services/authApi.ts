import api from './api.js';
import type { IUser } from '../types/index.js';

interface AuthResponse {
  success: boolean;
  token: string;
  user: IUser;
}

/** Logs in and returns JWT token + user */
export const login = async (username: string, password: string): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', { username, password });
  return response.data;
};

export const requestPasswordReset = async (username: string): Promise<string> => {
  const response = await api.post<{ success: boolean; message: string }>('/auth/forgot-password', { username });
  return response.data.message;
};

export const resetPasswordWithCode = async (username: string, code: string, password: string): Promise<string> => {
  const response = await api.post<{ success: boolean; message: string }>('/auth/reset-password', { username, code, password });
  return response.data.message;
};
