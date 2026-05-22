import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.js';
import { useUpload } from '../../hooks/useUpload.js';
import { Modal } from '../shared/Modal.js';
import { Button } from '../shared/Button.js';
import { Icon } from '../shared/Icon.js';
import { UploadProgress } from './UploadProgress.js';

export const UploadModal: React.FC = () => {
  const { state, dispatch } = useApp();
  const [subject, setSubject] = useState('Software Modeling and Design');
  const [chapter, setChapter] = useState<number>(1);
  const [chapterTitle, setChapterTitle] = useState('');

  const handleClose = () => {
    dispatch({ type: 'SET_UPLOAD_MODAL', payload: false });
    reset();
  };

  const {
    file,
    progress,
    status,
    error: uploadError,
    fileInputRef,
    handleFileChange,
    handleDragOver,
    handleDrop,
    startUpload,
    reset,
  } = useUpload(() => {
    // Refresh documents after success
    setTimeout(() => {
      handleClose();
    }, 1500);
  });

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterTitle.trim()) return;
    try {
      await startUpload(subject, chapter, chapterTitle.trim());
    } catch (err) {
      console.error('Upload failed', err);
    }
  };

  const isFormDisabled = status === 'uploading' || status === 'processing' || status === 'success';

  return (
    <Modal isOpen={state.uploadModalOpen} onClose={handleClose} title="Upload Course Material">
      <form onSubmit={handleFormSubmit} className="upload-form">
        {/* Drop Zone Area */}
        <div
          className={`dropzone flex-center flex-col ${file ? 'has-file' : ''} ${
            isFormDisabled ? 'disabled' : ''
          }`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isFormDisabled && fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.docx,.pptx"
            style={{ display: 'none' }}
            disabled={isFormDisabled}
          />
          <Icon name="cloud_upload" className="upload-icon" />
          {file ? (
            <div className="selected-file-details">
              <span className="file-name text-truncate">{file.name}</span>
              <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            </div>
          ) : (
            <div className="dropzone-labels">
              <span className="bold-label">Drag & drop or click to browse</span>
              <span className="sub-label">Supports PDF, DOCX, and PPTX up to 50MB</span>
            </div>
          )}
        </div>

        {uploadError && <span className="upload-error-label">{uploadError}</span>}

        {/* Inputs */}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <select
              id="subject"
              className="form-input form-select"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isFormDisabled}
            >
              <option value="Software Modeling and Design">Software Modeling and Design</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="chapter">Chapter Number</label>
            <input
              id="chapter"
              type="number"
              min="1"
              max="99"
              className="form-input"
              value={chapter}
              onChange={(e) => setChapter(Number(e.target.value))}
              disabled={isFormDisabled}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="chapterTitle">Chapter Title</label>
          <input
            id="chapterTitle"
            type="text"
            className="form-input"
            placeholder="e.g. Design Patterns, Iterative Development"
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
            disabled={isFormDisabled}
            required
          />
        </div>

        {/* Progress Bar */}
        {(status !== 'idle' || progress > 0) && (
          <UploadProgress progress={progress} status={status} />
        )}

        {/* Action Buttons */}
        <div className="modal-actions flex-center">
          <Button
            type="button"
            variant="text"
            onClick={handleClose}
            disabled={isFormDisabled}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            icon="upload"
            disabled={!file || !chapterTitle || isFormDisabled}
          >
            Index Document
          </Button>
        </div>
      </form>

      <style>{`
        .upload-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .dropzone {
          border: 2px dashed var(--color-outline-variant);
          border-radius: var(--radius-xl);
          padding: 32px 16px;
          cursor: pointer;
          transition: border-color var(--transition-fast), background-color var(--transition-fast);
          gap: 12px;
          text-align: center;
          background-color: var(--color-surface-container-low);
        }
        .dropzone:hover:not(.disabled) {
          border-color: var(--color-primary);
          background-color: var(--color-surface-container);
        }
        .dropzone.has-file {
          border-color: var(--color-success);
          background-color: #f6fbf7;
        }
        .dropzone.disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
        .upload-icon {
          font-size: 40px;
          color: var(--color-secondary);
        }
        .dropzone.has-file .upload-icon {
          color: var(--color-success);
        }
        .dropzone-labels {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .bold-label {
          font: var(--text-body-lg);
          font-weight: 600;
          color: var(--color-on-surface);
        }
        .sub-label {
          font: var(--text-label-md);
          color: var(--color-outline);
        }
        .selected-file-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-width: 90%;
        }
        .file-name {
          font: var(--text-body-lg);
          font-weight: 600;
          color: #137333;
        }
        .file-size {
          font: var(--text-label-md);
          color: var(--color-outline);
        }
        .upload-error-label {
          font: var(--text-label-md);
          color: var(--color-error);
          text-align: left;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
        }
        .modal-actions {
          justify-content: flex-end;
          gap: var(--spacing-md);
          margin-top: 16px;
        }
      `}</style>
    </Modal>
  );
};
