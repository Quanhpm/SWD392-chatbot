import api from './api.js';
import type { ISubject, ISubjectAssignment } from '../types/index.js';

/** Fetches all subjects from the backend. */
export const getSubjects = async (): Promise<ISubject[]> => {
  const response = await api.get<{ success: boolean; subjects: ISubject[] }>('/subjects');
  return response.data.subjects;
};

/** Creates a new subject (Admin only). */
export const createSubject = async (input: { code: string; name: string; description?: string }): Promise<ISubject> => {
  const response = await api.post<{ success: boolean; subject: ISubject }>('/subjects', input);
  return response.data.subject;
};

export const updateSubject = async (id: string, input: Partial<Pick<ISubject, 'code' | 'name' | 'description' | 'isActive'>>): Promise<ISubject> => {
  const response = await api.patch<{ success: boolean; subject: ISubject }>(`/subjects/${id}`, input);
  return response.data.subject;
};

/** Archives a subject (Admin only). */
export const deleteSubject = async (id: string): Promise<string> => {
  const response = await api.delete<{ success: boolean; message: string }>(`/subjects/${id}`);
  return response.data.message;
};

export const getSubjectTeachers = async (id: string): Promise<ISubjectAssignment[]> => {
  const response = await api.get<{ success: boolean; assignments: ISubjectAssignment[] }>(`/subjects/${id}/teachers`);
  return response.data.assignments;
};

export const assignTeacher = async (subjectId: string, teacherId: string): Promise<ISubjectAssignment> => {
  const response = await api.post<{ success: boolean; assignment: ISubjectAssignment }>(`/subjects/${subjectId}/teachers`, { teacherId });
  return response.data.assignment;
};

export const removeTeacher = async (subjectId: string, teacherId: string): Promise<void> => {
  await api.delete(`/subjects/${subjectId}/teachers/${teacherId}`);
};
