import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.js';
import { useUpload } from '../../hooks/useUpload.js';
import { Modal } from '../shared/Modal.js';
import { Button } from '../shared/Button.js';
import { UploadProgress } from './UploadProgress.js';

interface UploadModalProps { onClose?: () => void }

export const UploadModal: React.FC<UploadModalProps> = ({ onClose }) => {
  const { state, dispatch } = useApp();
  const [subjectId, setSubjectId] = useState('');
  const [chapter, setChapter] = useState(1);
  const [chapterTitle, setChapterTitle] = useState('');
  const { file, progress, status, error, fileInputRef, handleFileChange, handleDragOver, handleDrop, startUpload, reset } = useUpload(() => setTimeout(handleClose, 900));
  const effectiveSubjectId = subjectId || state.subjects[0]?._id || '';
  const disabled = ['uploading', 'processing', 'success'].includes(status);

  function handleClose() { dispatch({ type: 'SET_UPLOAD_MODAL', payload: false }); reset(); onClose?.(); }
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (effectiveSubjectId && chapterTitle.trim()) await startUpload(effectiveSubjectId, chapter, chapterTitle.trim()); };

  return <Modal isOpen={state.uploadModalOpen} onClose={handleClose} title="Upload tài liệu môn học"><form className="assignment-upload" onSubmit={submit}>
    <div className={`assignment-drop ${file ? 'has-file' : ''}`} onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => !disabled && fileInputRef.current?.click()}><input ref={fileInputRef} type="file" accept=".pdf,.docx,.pptx" hidden onChange={handleFileChange} /><span className="material-symbols-outlined">cloud_upload</span><strong>{file?.name || 'Kéo thả hoặc chọn PDF, DOCX, PPTX'}</strong><small>Tối đa 50 MB</small></div>
    {error && <div className="upload-error-label">{error}</div>}
    <label>Môn học được admin phân công<select value={effectiveSubjectId} disabled={disabled} onChange={(e) => setSubjectId(e.target.value)}>{state.subjects.map((subject) => <option value={subject._id} key={subject._id}>{subject.code} · {subject.name}</option>)}{state.subjects.length === 0 && <option value="">Không có môn được phân công</option>}</select></label>
    <div className="upload-fields"><label>Chương<input type="number" min={1} max={99} value={chapter} onChange={(e) => setChapter(Number(e.target.value))} /></label><label>Tiêu đề chương<input required value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder="Ví dụ: Design Patterns" /></label></div>
    {status !== 'idle' && <UploadProgress progress={progress} status={status} />}
    <p className="review-note">Sau khi parse và tạo embeddings, tài liệu sẽ ở trạng thái pending cho đến khi admin duyệt.</p>
    <div className="upload-actions"><Button type="button" variant="text" onClick={handleClose} disabled={disabled}>Hủy</Button><Button type="submit" icon="upload" disabled={!file || !effectiveSubjectId || !chapterTitle.trim() || disabled}>Upload & xử lý</Button></div>
    <style>{`.assignment-upload{display:flex;flex-direction:column;gap:16px}.assignment-drop{border:2px dashed #c5c5d3;border-radius:14px;padding:30px;display:flex;flex-direction:column;align-items:center;gap:7px;cursor:pointer;background:#f7f9fc}.assignment-drop.has-file{border-color:#006a61;background:#e9faf6}.assignment-drop .material-symbols-outlined{font-size:40px;color:#00236f}.assignment-upload label{display:flex;flex-direction:column;gap:6px;font-weight:600}.assignment-upload input,.assignment-upload select{border:1px solid #c5c5d3;padding:10px;border-radius:8px;background:#fff}.upload-fields{display:grid;grid-template-columns:130px 1fr;gap:12px}.review-note{background:#fff1c6;padding:10px;border-radius:8px;color:#684d00}.upload-actions{display:flex;justify-content:flex-end;gap:8px}`}</style>
  </form></Modal>;
};
