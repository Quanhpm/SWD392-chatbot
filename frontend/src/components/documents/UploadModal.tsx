import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.js';
import { useUpload } from '../../hooks/useUpload.js';
import { createSubject as apiCreateSubject } from '../../services/subjectApi.js';
import { Modal } from '../shared/Modal.js';
import { Button } from '../shared/Button.js';
import { Icon } from '../shared/Icon.js';
import { UploadProgress } from './UploadProgress.js';

interface UploadModalProps {
  /** Optional external close handler called after a successful upload or Cancel */
  onClose?: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ onClose }) => {
  const { state, dispatch } = useApp();
  const subjects = state.subjects;
  const [subjectId, setSubjectId] = useState('');
  const [chapter, setChapter] = useState<number>(1);
  const [chapterTitle, setChapterTitle] = useState('');
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [subjectCreating, setSubjectCreating] = useState(false);
  const [subjectError, setSubjectError] = useState<string | null>(null);

  // Auto-select first subject when subjects load
  const effectiveSubjectId = subjectId || (subjects.length > 0 ? subjects[0]!._id : '');

  const handleClose = () => {
    dispatch({ type: 'SET_UPLOAD_MODAL', payload: false });
    reset();
    setShowNewSubject(false);
    setNewSubjectName('');
    setSubjectError(null);
    onClose?.();
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
    setTimeout(() => {
      handleClose();
    }, 1500);
  });

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterTitle.trim() || !effectiveSubjectId) return;
    try {
      await startUpload(effectiveSubjectId, chapter, chapterTitle.trim());
    } catch (err) {
      console.error('Upload failed', err);
    }
  };

  const [newSubjectPassword, setNewSubjectPassword] = useState('');

  const handleCreateSubject = async () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed || !newSubjectPassword.trim()) return;
    setSubjectCreating(true);
    setSubjectError(null);
    try {
      const created = await apiCreateSubject(trimmed, newSubjectPassword.trim());
      dispatch({ type: 'ADD_SUBJECT', payload: created });
      setSubjectId(created._id);
      setNewSubjectName('');
      setNewSubjectPassword('');
      setShowNewSubject(false);
    } catch (err) {
      setSubjectError(err instanceof Error ? err.message : 'Failed to create subject');
    } finally {
      setSubjectCreating(false);
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

        {/* Subject selector */}
        <div className="form-group">
          <label htmlFor="subject">Subject</label>
          <div className="subject-row">
            <select
              id="subject"
              className="form-input form-select"
              value={effectiveSubjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={isFormDisabled}
            >
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
              {subjects.length === 0 && <option value="">No subjects available</option>}
            </select>
            <button
              type="button"
              className="add-subject-btn flex-center"
              onClick={() => setShowNewSubject(!showNewSubject)}
              disabled={isFormDisabled}
              title="Create new subject"
            >
              <Icon name={showNewSubject ? 'close' : 'add'} style={{ fontSize: '18px' }} />
            </button>
          </div>
        </div>

        {/* Inline new subject form */}
        {showNewSubject && (
          <div className="new-subject-fields fade-in">
            <div className="new-subject-row">
              <input
                type="text"
                className="form-input"
                placeholder="Tên môn học..."
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                disabled={subjectCreating}
                autoFocus
              />
              <input
                type="password"
                className="form-input"
                placeholder="Mật khẩu..."
                value={newSubjectPassword}
                onChange={(e) => setNewSubjectPassword(e.target.value)}
                disabled={subjectCreating}
              />
              <Button
                type="button"
                variant="filled"
                onClick={handleCreateSubject}
                disabled={!newSubjectName.trim() || !newSubjectPassword.trim() || subjectCreating}
                loading={subjectCreating}
              >
                Tạo
              </Button>
            </div>
          </div>
        )}
        {subjectError && <span className="upload-error-label">{subjectError}</span>}

        {/* Chapter inputs */}
        <div className="form-grid">
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
            disabled={!file || !chapterTitle || !effectiveSubjectId || isFormDisabled}
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
        .subject-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .subject-row .form-input {
          flex: 1;
        }
        .add-subject-btn {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-lg);
          color: var(--color-primary);
          border: 1px solid var(--color-outline-variant);
          background-color: var(--color-surface-container-lowest);
          transition: background-color var(--transition-fast), border-color var(--transition-fast);
          flex-shrink: 0;
        }
        .add-subject-btn:hover:not(:disabled) {
          background-color: var(--color-primary-fixed);
          border-color: var(--color-primary);
        }
        .new-subject-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .new-subject-row .form-input {
          flex: 1;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
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
