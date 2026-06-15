import api from './api.js';
import type { IClassEnrollment, ICourseClass } from '../types/index.js';

export const getClasses = async (): Promise<ICourseClass[]> => {
  const response = await api.get<{ success: boolean; classes: ICourseClass[] }>('/classes');
  return response.data.classes;
};

export const createClass = async (input: {
  code: string;
  name: string;
  subjectId: string;
  teacherId?: string;
  status?: ICourseClass['status'];
  allowSelfEnrollment?: boolean;
}): Promise<ICourseClass> => {
  const response = await api.post<{ success: boolean; class: ICourseClass }>('/classes', input);
  return response.data.class;
};

export const updateClass = async (id: string, input: Partial<Pick<ICourseClass, 'code' | 'name' | 'status' | 'allowSelfEnrollment'> & { teacherId: string | null }>): Promise<ICourseClass> => {
  const response = await api.patch<{ success: boolean; class: ICourseClass }>(`/classes/${id}`, input);
  return response.data.class;
};

export const archiveClass = async (id: string): Promise<ICourseClass> => {
  const response = await api.delete<{ success: boolean; class: ICourseClass }>(`/classes/${id}`);
  return response.data.class;
};

export const regenerateJoinCode = async (id: string): Promise<string> => {
  const response = await api.post<{ success: boolean; joinCode: string }>(`/classes/${id}/regenerate-code`);
  return response.data.joinCode;
};

export const joinClass = async (joinCode: string): Promise<string> => {
  const response = await api.post<{ success: boolean; message: string }>('/classes/join', { joinCode });
  return response.data.message;
};

export const getRoster = async (classId: string): Promise<IClassEnrollment[]> => {
  const response = await api.get<{ success: boolean; enrollments: IClassEnrollment[] }>(`/classes/${classId}/roster`);
  return response.data.enrollments;
};

export const addStudent = async (classId: string, studentId: string): Promise<void> => {
  await api.post(`/classes/${classId}/students`, { studentId });
};

export const removeStudent = async (classId: string, studentId: string): Promise<void> => {
  await api.delete(`/classes/${classId}/students/${studentId}`);
};
