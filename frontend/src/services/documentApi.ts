import api from './api.js';
import type { IDocument, IChunk } from '../types/index.js';

export interface UploadParams {
  file: File;
  subjectId: string;
  chapter: number;
  chapterTitle: string;
}

export const uploadDocument = async (params: UploadParams, onUploadProgress?: (progressEvent: any) => void): Promise<IDocument> => {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('subjectId', params.subjectId);
  formData.append('chapter', String(params.chapter));
  formData.append('chapterTitle', params.chapterTitle);
  const response = await api.post<{ success: boolean; document: IDocument }>('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress,
  });
  return response.data.document;
};

export const getDocuments = async (filters?: { subject?: string; status?: string }): Promise<IDocument[]> => {
  const response = await api.get<{ success: boolean; documents: IDocument[] }>('/documents', { params: filters });
  return response.data.documents;
};

export const getDocumentById = async (id: string): Promise<IDocument> => {
  const response = await api.get<{ success: boolean; document: IDocument }>(`/documents/${id}`);
  return response.data.document;
};

export const deleteDocument = async (id: string): Promise<string> => {
  const response = await api.delete<{ success: boolean; message: string }>(`/documents/${id}`);
  return response.data.message;
};

export const updateDocument = async (id: string, input: { originalName?: string; chapter?: number; chapterTitle?: string }): Promise<IDocument> => {
  const response = await api.patch<{ success: boolean; document: IDocument }>(`/documents/${id}`, input);
  return response.data.document;
};

export const retryDocument = async (id: string): Promise<void> => { await api.post(`/documents/${id}/retry`); };

export const getDocumentChunks = async (id: string): Promise<IChunk[]> => {
  const response = await api.get<{ success: boolean; chunks: IChunk[] }>(`/documents/${id}/chunks`);
  return response.data.chunks;
};

export const getDocumentFileBlob = async (id: string): Promise<string> => {
  const response = await api.get<Blob>(`/documents/${id}/file`, { responseType: 'blob' });
  return URL.createObjectURL(response.data);
};
