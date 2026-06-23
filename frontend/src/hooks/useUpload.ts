import { useState, useRef } from 'react';
import { useDocuments } from './useDocuments.js';

export const useUpload = (onSuccess?: () => void) => {
  const { uploadFile } = useDocuments();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (selectedFile: File): boolean => {
    setError(null);
    const allowedExtensions = ['pdf', 'docx', 'pptx'];
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();

    if (!extension || !allowedExtensions.includes(extension)) {
      setError('Invalid file type. Only PDF, DOCX, and PPTX are supported.');
      return false;
    }

    const maxSize = 50 * 1024 * 1024; // 50 MB
    if (selectedFile.size > maxSize) {
      setError('File is too large. Maximum size allowed is 50MB.');
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (validateFile(selected)) {
        setFile(selected);
      } else {
        setFile(null);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (validateFile(selected)) {
        setFile(selected);
      } else {
        setFile(null);
      }
    }
  };

  const startUpload = async (
    subjectId: string,
    chapter: number,
    chapterTitle: string,
  ) => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setStatus('uploading');
    setProgress(0);
    setError(null);

    try {
      await uploadFile(file, subjectId, chapter, chapterTitle, (percent) => {
        setProgress(percent);
        if (percent === 100) {
          setStatus('processing');
        }
      });
      setStatus('success');
      setFile(null);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setStatus('failed');
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const reset = () => {
    setFile(null);
    setProgress(0);
    setStatus('idle');
    setError(null);
  };

  return {
    file,
    progress,
    status,
    error,
    fileInputRef,
    handleFileChange,
    handleDragOver,
    handleDrop,
    startUpload,
    reset,
  };
};
