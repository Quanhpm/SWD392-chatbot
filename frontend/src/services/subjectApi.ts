import api from './api.js';
import type { ISubject } from '../types/index.js';

/** Fetches all subjects from the backend. */
export const getSubjects = async (): Promise<ISubject[]> => {
  const response = await api.get<{ success: boolean; subjects: ISubject[] }>('/subjects');
  return response.data.subjects;
};

/** Creates a new subject (Teacher only). */
export const createSubject = async (
  name: string,
  password: string,
  description?: string,
): Promise<ISubject> => {
  const response = await api.post<{ success: boolean; subject: ISubject }>('/subjects', {
    name,
    password,
    description,
  });
  return response.data.subject;
};

/** Enrolls the current student in a subject using a course password. */
export const enrollInSubject = async (subjectId: string, password: string): Promise<string> => {
  const response = await api.post<{ success: boolean; message: string }>(
    `/subjects/${subjectId}/enroll`,
    { password },
  );
  return response.data.message;
};

/** Deletes a subject by ID (Teacher only). */
export const deleteSubject = async (id: string): Promise<string> => {
  const response = await api.delete<{ success: boolean; message: string }>(`/subjects/${id}`);
  return response.data.message;
};
