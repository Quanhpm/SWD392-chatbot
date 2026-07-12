import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.js';
import * as docApi from '../services/documentApi.js';
import type { IDocument } from '../types/index.js';

export const useDocuments = () => {
  const { state, dispatch, refreshDocuments } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deletingRef = useRef<string | null>(null);

  // Poll for processing or uploaded documents
  useEffect(() => {
    const activeProcessingDocs = state.documents.filter(
      (doc) => doc.status === 'uploaded' || doc.status === 'processing'
    );

    if (activeProcessingDocs.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const currentDocs = await docApi.getDocuments();
        dispatch({ type: 'SET_DOCUMENTS', payload: currentDocs });
      } catch (err) {
        console.error('Polling failed', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [state.documents, dispatch]);

  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await refreshDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setIsLoading(false);
    }
  };

  const removeDocument = async (id: string) => {
    if (deletingRef.current) return;
    deletingRef.current = id;
    setDeletingId(id);
    setError(null);
    try {
      await docApi.deleteDocument(id);
      dispatch({ type: 'REMOVE_DOCUMENT', payload: id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
      throw err;
    } finally {
      deletingRef.current = null;
      setDeletingId(null);
    }
  };

  const uploadFile = async (
    file: File,
    subjectId: string,
    chapter: number,
    chapterTitle: string,
    onProgress?: (progress: number) => void
  ): Promise<IDocument> => {
    setError(null);
    try {
      const doc = await docApi.uploadDocument(
        { file, subjectId, chapter, chapterTitle },
        (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        }
      );
      dispatch({ type: 'ADD_DOCUMENT', payload: doc });
      return doc;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload document';
      setError(msg);
      throw new Error(msg);
    }
  };

  return {
    documents: state.documents,
    isLoading,
    error,
    loadDocuments,
    removeDocument,
    deletingId,
    uploadFile,
  };
};
