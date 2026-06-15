import api from './api.js';
import type { IUser } from '../types/index.js';

interface AuthResponse {
  success: boolean;
  token: string;
  user: IUser;
}

/** Registers a new user and returns JWT token + user */
export const register = async (
  input: { username: string; password: string; fullName: string; email: string; userCode: string },
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/register', input);
  return response.data;
};

/** Logs in and returns JWT token + user */
export const login = async (username: string, password: string): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', { username, password });
  return response.data;
};
