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
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (effectiveSubjectId && chapterTitle.trim()) await startUpload(effectiveSubjectId, chapter, chapterTitle.trim());
  };

  return <Modal isOpen={state.uploadModalOpen} onClose={handleClose} title="Upload tài liệu môn học"><form className="subject-upload" onSubmit={submit}>
    <div className={`subject-drop ${file ? 'has-file' : ''}`} onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => !disabled && fileInputRef.current?.click()}>
      <input ref={fileInputRef} type="file" accept=".pdf,.docx,.pptx" hidden onChange={handleFileChange} />
      <span className="material-symbols-outlined">cloud_upload</span><strong>{file?.name || 'Kéo thả hoặc chọn PDF, DOCX, PPTX'}</strong><small>Tối đa 50 MB</small>
    </div>
    {error && <div className="upload-error-label">{error}</div>}
    <label>Môn học được phân công<select value={effectiveSubjectId} disabled={disabled} onChange={(e) => setSubjectId(e.target.value)}>{state.subjects.map((subject) => <option value={subject._id} key={subject._id}>{subject.code} · {subject.name}</option>)}{state.subjects.length === 0 && <option value="">Không có môn được phân công</option>}</select></label>
    <div className="upload-fields"><label>Chương<input type="number" min={0} max={999} value={chapter} disabled={disabled} onChange={(e) => setChapter(Number(e.target.value))} /></label><label>Tiêu đề chương<input required value={chapterTitle} disabled={disabled} onChange={(e) => setChapterTitle(e.target.value)} placeholder="Ví dụ: Design Patterns" /></label></div>
    {status !== 'idle' && <UploadProgress progress={progress} status={status} />}
    <p className="publish-note">Tài liệu sẽ tự động hiển thị cho sinh viên sau khi xử lý thành công.</p>
    <div className="upload-actions"><Button type="button" variant="text" onClick={handleClose} disabled={disabled}>Hủy</Button><Button type="submit" icon="upload" loading={status === 'uploading' || status === 'processing'} disabled={!file || !effectiveSubjectId || !chapterTitle.trim() || disabled}>Upload & xử lý</Button></div>
    <style>{`.subject-upload{display:flex;flex-direction:column;gap:14px}.subject-drop{border:1px dashed #94a3b8;border-radius:10px;padding:26px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;background:#f8fafc;text-align:center}.subject-drop:hover{border-color:var(--color-primary);background:#f8fbff}.subject-drop.has-file{border-color:#86efac;background:#f0fdf4}.subject-drop .material-symbols-outlined{font-size:32px;color:var(--color-primary)}.subject-upload>label,.upload-fields label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:#334155}.subject-upload input,.subject-upload select{border:1px solid var(--color-outline-variant);padding:9px 10px;border-radius:8px;background:#fff}.upload-fields{display:grid;grid-template-columns:120px 1fr;gap:10px}.publish-note{background:#eff6ff;border:1px solid #dbeafe;padding:9px 10px;border-radius:8px;color:#1e40af;font-size:12px}.upload-actions{display:flex;justify-content:flex-end;gap:8px}`}</style>
  </form></Modal>;
};
