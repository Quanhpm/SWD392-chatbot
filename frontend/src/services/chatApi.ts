import api from './api.js';
import type { IChatSession, IChatMessage } from '../types/index.js';

/**
 * Creates a new chat session
 */
export const createSession = async (subjectId: string, title?: string): Promise<IChatSession> => {
  const response = await api.post<{ success: boolean; session: IChatSession }>('/chat/sessions', {
    subjectId,
    title,
  });
  return response.data.session;
};

/**
 * Retrieves all chat sessions (messages excluded for list view)
 */
export const getSessions = async (): Promise<IChatSession[]> => {
  const response = await api.get<{ success: boolean; sessions: IChatSession[] }>('/chat/sessions');
  return response.data.sessions;
};

/**
 * Gets a chat session details, including complete message history
 */
export const getSessionById = async (id: string): Promise<IChatSession> => {
  const response = await api.get<{ success: boolean; session: IChatSession }>(`/chat/sessions/${id}`);
  return response.data.session;
};

/**
 * Sends a message in a chat session and awaits an assistant response
 */
export const sendMessage = async (sessionId: string, message: string): Promise<IChatMessage> => {
  const response = await api.post<{ success: boolean; reply: IChatMessage }>(`/chat/sessions/${sessionId}/messages`, {
    message,
  });
  return response.data.reply;
};

/**
 * Deletes a chat session
 */
export const deleteSession = async (id: string): Promise<void> => {
  await api.delete<{ success: boolean; message: string }>(`/chat/sessions/${id}`);
};
