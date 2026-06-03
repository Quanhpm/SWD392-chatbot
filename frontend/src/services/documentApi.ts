import api from './api.js';
import type { IDocument, IChunk } from '../types/index.js';

export interface UploadParams {
  file: File;
  subjectId: string;
  chapter: number;
  chapterTitle: string;
}

/**
 * Uploads a document file to the backend
 */
export const uploadDocument = async (
  params: UploadParams,
  onUploadProgress?: (progressEvent: any) => void
): Promise<IDocument> => {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('subjectId', params.subjectId);
  formData.append('chapter', String(params.chapter));
  formData.append('chapterTitle', params.chapterTitle);

  const response = await api.post<{ success: boolean; document: IDocument }>('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });

  return response.data.document;
};

/**
 * Retrieves all indexed documents, optionally filtered by subject/status
 */
export const getDocuments = async (filters?: { subject?: string; status?: string }): Promise<IDocument[]> => {
  const response = await api.get<{ success: boolean; documents: IDocument[] }>('/documents', {
    params: filters,
  });
  return response.data.documents;
};

/**
 * Gets a single document by its database ID
 */
export const getDocumentById = async (id: string): Promise<IDocument> => {
  const response = await api.get<{ success: boolean; document: IDocument }>(`/documents/${id}`);
  return response.data.document;
};

/**
 * Deletes a single document and all associated text chunks
 */
export const deleteDocument = async (id: string): Promise<string> => {
  const response = await api.delete<{ success: boolean; message: string }>(`/documents/${id}`);
  return response.data.message;
};

/**
 * Gets plain text chunks of a single document sorted by index
 */
export const getDocumentChunks = async (id: string): Promise<IChunk[]> => {
  const response = await api.get<{ success: boolean; chunks: IChunk[] }>(`/documents/${id}/chunks`);
  return response.data.chunks;
};
