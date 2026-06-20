import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext.js';
import { useUpload } from '../../hooks/useUpload.js';
import { Modal } from '../shared/Modal.js';
import { Button } from '../shared/Button.js';
import { UploadProgress } from './UploadProgress.js';
import { getClasses } from '../../services/classApi.js';
import type { DocumentVisibility, ICourseClass } from '../../types/index.js';

interface UploadModalProps { onClose?: () => void }

export const UploadModal: React.FC<UploadModalProps> = ({ onClose }) => {
  const { state, dispatch } = useApp();
  const [subjectId, setSubjectId] = useState('');
  const [visibility, setVisibility] = useState<DocumentVisibility>('class-restricted');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [classes, setClasses] = useState<ICourseClass[]>([]);
  const [chapter, setChapter] = useState(1);
  const [chapterTitle, setChapterTitle] = useState('');
  const { file, progress, status, error, fileInputRef, handleFileChange, handleDragOver, handleDrop, startUpload, reset } = useUpload(() => setTimeout(handleClose, 900));
  const effectiveSubjectId = subjectId || state.subjects[0]?._id || '';
  const disabled = ['uploading', 'processing', 'success'].includes(status);
  const eligibleClasses = classes.filter((courseClass) => {
    const classSubjectId = typeof courseClass.subjectId === 'string' ? courseClass.subjectId : courseClass.subjectId._id;
    return courseClass.status === 'active' && classSubjectId === effectiveSubjectId;
  });

  useEffect(() => {
    void getClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    setSelectedClassIds((current) => current.filter((id) => eligibleClasses.some((courseClass) => courseClass._id === id)));
  }, [effectiveSubjectId, classes]);

  function handleClose() { dispatch({ type: 'SET_UPLOAD_MODAL', payload: false }); reset(); onClose?.(); }
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (effectiveSubjectId && chapterTitle.trim()) {
      await startUpload(effectiveSubjectId, visibility, selectedClassIds, chapter, chapterTitle.trim());
    }
  };

  return <Modal isOpen={state.uploadModalOpen} onClose={handleClose} title="Upload tài liệu môn học"><form className="assignment-upload" onSubmit={submit}>
    <div className={`assignment-drop ${file ? 'has-file' : ''}`} onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => !disabled && fileInputRef.current?.click()}><input ref={fileInputRef} type="file" accept=".pdf,.docx,.pptx" hidden onChange={handleFileChange} /><span className="material-symbols-outlined">cloud_upload</span><strong>{file?.name || 'Kéo thả hoặc chọn PDF, DOCX, PPTX'}</strong><small>Tối đa 50 MB</small></div>
    {error && <div className="upload-error-label">{error}</div>}
    <label>Môn học được admin phân công<select value={effectiveSubjectId} disabled={disabled} onChange={(e) => setSubjectId(e.target.value)}>{state.subjects.map((subject) => <option value={subject._id} key={subject._id}>{subject.code} · {subject.name}</option>)}{state.subjects.length === 0 && <option value="">Không có môn được phân công</option>}</select></label>
    <label>Phạm vi tài liệu<select value={visibility} disabled={disabled} onChange={(e) => setVisibility(e.target.value as DocumentVisibility)}><option value="class-restricted">Chỉ các lớp được chọn</option><option value="subject-wide">Dùng chung toàn môn</option></select></label>
    {visibility === 'class-restricted' && <fieldset className="class-scope"><legend>Chọn lớp được phép truy cập</legend>{eligibleClasses.map((courseClass) => <label className="class-option" key={courseClass._id}><input type="checkbox" checked={selectedClassIds.includes(courseClass._id)} disabled={disabled} onChange={(e) => setSelectedClassIds((current) => e.target.checked ? [...current, courseClass._id] : current.filter((id) => id !== courseClass._id))} /><span><strong>{courseClass.code}</strong> · {courseClass.name}</span></label>)}{eligibleClasses.length === 0 && <small>Không có lớp active thuộc môn học này.</small>}</fieldset>}
    <div className="upload-fields"><label>Chương<input type="number" min={1} max={99} value={chapter} onChange={(e) => setChapter(Number(e.target.value))} /></label><label>Tiêu đề chương<input required value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder="Ví dụ: Design Patterns" /></label></div>
    {status !== 'idle' && <UploadProgress progress={progress} status={status} />}
    <p className="review-note">Admin sẽ thấy rõ phạm vi lớp khi duyệt. “Dùng chung toàn môn” cho phép mọi lớp active của môn truy cập tài liệu.</p>
    <div className="upload-actions"><Button type="button" variant="text" onClick={handleClose} disabled={disabled}>Hủy</Button><Button type="submit" icon="upload" disabled={!file || !effectiveSubjectId || !chapterTitle.trim() || (visibility === 'class-restricted' && selectedClassIds.length === 0) || disabled}>Upload & xử lý</Button></div>
    <style>{`.assignment-upload{display:flex;flex-direction:column;gap:14px}.assignment-drop{border:1px dashed #94a3b8;border-radius:10px;padding:26px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;background:#f8fafc;text-align:center}.assignment-drop:hover{border-color:var(--color-primary);background:#f8fbff}.assignment-drop.has-file{border-color:#86efac;background:#f0fdf4}.assignment-drop .material-symbols-outlined{font-size:32px;color:var(--color-primary)}.assignment-upload>label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:#334155}.assignment-upload input,.assignment-upload select{border:1px solid var(--color-outline-variant);padding:9px 10px;border-radius:8px;background:#fff}.assignment-upload input:focus,.assignment-upload select:focus{border-color:var(--color-primary);box-shadow:0 0 0 3px rgb(37 99 235/.1)}.upload-fields{display:grid;grid-template-columns:120px 1fr;gap:10px}.upload-fields label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:#334155}.class-scope{border:1px solid var(--color-outline-variant);border-radius:9px;padding:12px;display:grid;gap:8px}.class-scope legend{padding:0 6px;font-size:13px;font-weight:600}.class-option{display:flex;align-items:center;gap:8px;font-weight:400;color:#475569}.class-option input{width:auto;box-shadow:none}.review-note{background:#fffbeb;border:1px solid #fef3c7;padding:9px 10px;border-radius:8px;color:#92400e;font-size:12px;line-height:1.5}.upload-actions{display:flex;justify-content:flex-end;gap:8px}`}</style>
  </form></Modal>;
};
