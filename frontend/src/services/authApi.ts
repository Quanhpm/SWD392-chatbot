import api from './api.js';
import type { IUser, UserRole } from '../types/index.js';

interface AuthResponse {
  success: boolean;
  token: string;
  user: IUser;
}

/** Registers a new user and returns JWT token + user */
export const register = async (
  username: string,
  password: string,
  role: UserRole,
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/register', { username, password, role });
  return response.data;
};

/** Logs in and returns JWT token + user */
export const login = async (username: string, password: string): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', { username, password });
  return response.data;
};
