import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useApp } from '../context/AppContext.js';
import { createSubject, deleteSubject } from '../services/subjectApi.js';
import type { ISubject, IDocument } from '../types/index.js';

export const TeacherDashboard: React.FC = () => {
  const { state: authState } = useAuth();
  const { state: appState, dispatch, refreshSubjects } = useApp();

  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectPassword, setNewSubjectPassword] = useState('');
  const [newSubjectDesc, setNewSubjectDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const subjects = appState.subjects as ISubject[];
  const documents = appState.documents as IDocument[];

  // Stats
  const totalDocs = documents.length;
  const indexedDocs = documents.filter(d => d.status === 'indexed').length;
  const processingDocs = documents.filter(d => d.status === 'processing' || d.status === 'uploaded').length;

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);
    try {
      await createSubject(newSubjectName, newSubjectPassword, newSubjectDesc || undefined);
      await refreshSubjects();
      setNewSubjectName('');
      setNewSubjectPassword('');
      setNewSubjectDesc('');
      setShowCreateSubject(false);
      setSuccessMsg('Môn học đã được tạo thành công!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Tạo môn học thất bại');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (!confirm(`Xóa môn học "${name}"? Thao tác này không thể hoàn tác.`)) return;
    try {
      await deleteSubject(id);
      dispatch({ type: 'REMOVE_SUBJECT', payload: id });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Xóa môn học thất bại');
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Xóa tài liệu này và toàn bộ chunks của nó?')) return;
    try {
      const { deleteDocument } = await import('../services/documentApi.js');
      await deleteDocument(docId);
      dispatch({ type: 'REMOVE_DOCUMENT', payload: docId });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Xóa thất bại');
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string; icon: string }> = {
      indexed:    { cls: 'badge badge-success',    label: 'Đã lập chỉ mục', icon: 'check_circle' },
      processing: { cls: 'badge badge-processing', label: 'Đang xử lý',    icon: 'refresh' },
      uploaded:   { cls: 'badge badge-processing', label: 'Đã tải lên',    icon: 'upload' },
      failed:     { cls: 'badge badge-failed',     label: 'Lỗi',           icon: 'error' },
    };
    const s = map[status] ?? { cls: 'badge badge-neutral', label: status, icon: 'help' };
    return (
      <span className={s.cls}>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{s.icon}</span>
        {s.label}
      </span>
    );
  };

  return (
    <div className="dashboard-page">
      {/* Toast */}
      {successMsg && (
        <div className="toast toast-success">
          <span className="material-symbols-outlined">check_circle</span>
          {successMsg}
        </div>
      )}

      {/* Hero */}
      <section className="dashboard-hero">
        <div className="dashboard-hero-content">
          <div>
            <p className="dashboard-hero-greeting">Chào mừng,</p>
            <h1 className="dashboard-hero-title">{authState.user?.username} 👋</h1>
            <p className="dashboard-hero-sub">Bảng điều khiển Giảng viên — Quản lý môn học và tài liệu học tập của bạn.</p>
          </div>
          <div className="dashboard-hero-actions">
            <button className="btn-primary" onClick={() => setShowCreateSubject(true)}>
              <span className="material-symbols-outlined">add</span>
              Tạo Môn học
            </button>
            <button
              className="btn-outline"
              style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)', color: 'white' }}
              onClick={() => dispatch({ type: 'SET_UPLOAD_MODAL', payload: true })}
            >
              <span className="material-symbols-outlined">upload_file</span>
              Tải tài liệu
            </button>
          </div>
        </div>
      </section>

      {/* Metric Cards */}
      <div className="dashboard-metrics">
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'var(--color-primary-fixed)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>class</span>
          </div>
          <div>
            <p className="metric-value">{subjects.length}</p>
            <p className="metric-label">Môn học</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'var(--color-secondary-container)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)' }}>description</span>
          </div>
          <div>
            <p className="metric-value">{totalDocs}</p>
            <p className="metric-label">Tài liệu</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: '#fff3e0' }}>
            <span className="material-symbols-outlined" style={{ color: '#e65100' }}>hub</span>
          </div>
          <div>
            <p className="metric-value">{indexedDocs}</p>
            <p className="metric-label">Đã lập chỉ mục</p>
          </div>
        </div>
        {processingDocs > 0 && (
          <div className="metric-card">
            <div className="metric-icon" style={{ background: 'var(--color-primary-fixed)' }}>
              <span className="spinner spinner-sm" />
            </div>
            <div>
              <p className="metric-value">{processingDocs}</p>
              <p className="metric-label">Đang xử lý</p>
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-body">
        {/* Subjects Panel */}
        <section className="dashboard-panel">
          <div className="panel-header">
            <h2 className="panel-title">
              <span className="material-symbols-outlined">school</span>
              Môn học của tôi
            </h2>
            <button className="btn-ghost" onClick={() => setShowCreateSubject(true)}>
              <span className="material-symbols-outlined">add</span>
              Thêm mới
            </button>
          </div>
          {subjects.length === 0 ? (
            <div className="panel-empty">
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }}>school</span>
              <p>Chưa có môn học. Hãy tạo môn học đầu tiên!</p>
              <button className="btn-primary" onClick={() => setShowCreateSubject(true)}>Tạo môn học</button>
            </div>
          ) : (
            <div className="subjects-table">
              {subjects.map((subj) => (
                <div key={subj._id} className="subject-row">
                  <div className="subject-row-info">
                    <div className="subject-row-icon">
                      <span className="material-symbols-outlined">class</span>
                    </div>
                    <div>
                      <p className="subject-row-name">{subj.name}</p>
                      {subj.description && <p className="subject-row-desc">{subj.description}</p>}
                      <p className="subject-row-meta">
                        {new Date(subj.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <div className="subject-row-actions">
                    <span className="badge badge-neutral">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>lock</span>
                      Có mật khẩu
                    </span>
                    <button
                      className="icon-btn icon-btn-danger"
                      title="Xóa môn học"
                      onClick={() => handleDeleteSubject(subj._id, subj.name)}
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Documents Panel */}
        <section className="dashboard-panel">
          <div className="panel-header">
            <h2 className="panel-title">
              <span className="material-symbols-outlined">description</span>
              Tài liệu học tập
            </h2>
              <button className="btn-ghost" onClick={() => dispatch({ type: 'SET_UPLOAD_MODAL', payload: true })}>
              <span className="material-symbols-outlined">upload_file</span>
              Tải lên
            </button>
          </div>
          {documents.length === 0 ? (
            <div className="panel-empty">
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }}>description</span>
              <p>Chưa có tài liệu. Hãy tải lên tài liệu đầu tiên!</p>
              <button className="btn-primary" onClick={() => dispatch({ type: 'SET_UPLOAD_MODAL', payload: true })}>Tải tài liệu</button>
            </div>
          ) : (
            <div className="docs-list">
              {documents.map((doc) => (
                <div key={doc._id} className="doc-row">
                  <div className="doc-row-icon">
                    <span className="material-symbols-outlined">
                      {doc.fileType === 'pdf' ? 'picture_as_pdf' : doc.fileType === 'docx' ? 'description' : 'slideshow'}
                    </span>
                  </div>
                  <div className="doc-row-info">
                    <p className="doc-row-name">{doc.originalName}</p>
                    <p className="doc-row-meta">
                      {doc.subject} · Chương {doc.chapter}: {doc.chapterTitle}
                    </p>
                    {doc.status === 'failed' && doc.errorMessage && (
                      <p className="doc-row-error">{doc.errorMessage}</p>
                    )}
                  </div>
                  <div className="doc-row-status">
                    {getStatusBadge(doc.status)}
                    {doc.totalChunks > 0 && (
                      <span className="doc-chunks">{doc.totalChunks} chunks</span>
                    )}
                  </div>
                  <button
                    className="icon-btn icon-btn-danger"
                    title="Xóa tài liệu"
                    onClick={() => handleDeleteDoc(doc._id)}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Create Subject Modal */}
      {showCreateSubject && (
        <div className="modal-overlay" onClick={() => setShowCreateSubject(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-header">
              <div className="modal-icon-wrap">
                <span className="material-symbols-outlined">add_circle</span>
              </div>
              <h3 className="modal-title">Tạo Môn học mới</h3>
              <p className="modal-sub">Tạo môn học có mật khẩu để kiểm soát quyền truy cập của sinh viên.</p>
            </div>
            <form onSubmit={handleCreateSubject} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-field">
                <label className="field-label">Tên môn học *</label>
                <div className="form-input-icon-wrap">
                  <span className="material-symbols-outlined form-input-icon">class</span>
                  <input
                    className="form-input"
                    placeholder="VD: SWD391 - Phát triển phần mềm"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="form-field">
                <label className="field-label">Mật khẩu truy cập *</label>
                <div className="form-input-icon-wrap">
                  <span className="material-symbols-outlined form-input-icon">lock</span>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Ít nhất 4 ký tự"
                    value={newSubjectPassword}
                    onChange={(e) => setNewSubjectPassword(e.target.value)}
                    required
                    minLength={4}
                  />
                </div>
              </div>
              <div className="form-field">
                <label className="field-label">Mô tả (tùy chọn)</label>
                <textarea
                  className="form-input"
                  placeholder="Mô tả ngắn về nội dung môn học..."
                  value={newSubjectDesc}
                  onChange={(e) => setNewSubjectDesc(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
              {createError && (
                <div className="login-error">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                  {createError}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowCreateSubject(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn-primary" disabled={isCreating}>
                  {isCreating ? <><span className="spinner spinner-sm" /> Đang tạo...</> : <><span className="material-symbols-outlined">check</span> Tạo môn học</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .dashboard-page {
          padding: var(--spacing-xl) var(--page-margin);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
          max-width: 1280px;
          margin: 0 auto;
          width: 100%;
        }

        .dashboard-hero {
          background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 60%, var(--color-secondary) 100%);
          border-radius: var(--radius-3xl);
          padding: 40px 48px;
          color: white;
          position: relative;
          overflow: hidden;
        }
        .dashboard-hero::after {
          content: '';
          position: absolute;
          top: -40px;
          right: -40px;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          pointer-events: none;
        }
        .dashboard-hero-content {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 24px;
        }
        .dashboard-hero-greeting {
          font: var(--text-body-md);
          opacity: 0.8;
        }
        .dashboard-hero-title {
          font: var(--text-headline-xl);
          color: white;
          margin-bottom: 8px;
        }
        .dashboard-hero-sub {
          font: var(--text-body-sm);
          opacity: 0.78;
          max-width: 440px;
        }
        .dashboard-hero-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Metrics */
        .dashboard-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }
        .metric-card {
          background: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-2xl);
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: var(--shadow-sm);
          transition: box-shadow var(--transition-base), transform var(--transition-base);
        }
        .metric-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .metric-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-xl);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .metric-value { font: var(--text-headline-lg); color: var(--color-on-surface); }
        .metric-label { font: var(--text-body-sm); color: var(--color-on-surface-variant); margin-top: 2px; }

        /* Body */
        .dashboard-body {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 1200px) {
          .dashboard-body { grid-template-columns: 1fr 1fr; }
        }

        /* Panel */
        .dashboard-panel {
          background: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-2xl);
          overflow: hidden;
        }
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--color-outline-variant);
        }
        .panel-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font: var(--text-headline-md);
          color: var(--color-on-surface);
        }
        .panel-empty {
          padding: 48px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--color-on-surface-variant);
          font: var(--text-body-md);
          text-align: center;
        }

        /* Subject Rows */
        .subjects-table { display: flex; flex-direction: column; }
        .subject-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 24px;
          border-bottom: 1px solid var(--color-outline-variant);
          gap: 12px;
          transition: background var(--transition-fast);
        }
        .subject-row:last-child { border-bottom: none; }
        .subject-row:hover { background: var(--color-surface-container-low); }
        .subject-row-info { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .subject-row-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-lg);
          background: var(--color-primary-fixed);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-primary);
          flex-shrink: 0;
        }
        .subject-row-name { font: var(--text-label-md); color: var(--color-on-surface); }
        .subject-row-desc { font: var(--text-body-sm); color: var(--color-on-surface-variant); margin-top: 2px; }
        .subject-row-meta { font: var(--text-label-sm); color: var(--color-outline); margin-top: 2px; }
        .subject-row-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

        /* Doc Rows */
        .docs-list { display: flex; flex-direction: column; }
        .doc-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 24px;
          border-bottom: 1px solid var(--color-outline-variant);
          transition: background var(--transition-fast);
        }
        .doc-row:last-child { border-bottom: none; }
        .doc-row:hover { background: var(--color-surface-container-low); }
        .doc-row-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-lg);
          background: var(--color-surface-container-high);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-secondary);
          flex-shrink: 0;
        }
        .doc-row-info { flex: 1; min-width: 0; }
        .doc-row-name { font: var(--text-label-md); color: var(--color-on-surface); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .doc-row-meta { font: var(--text-body-sm); color: var(--color-on-surface-variant); margin-top: 2px; }
        .doc-row-error { font: var(--text-label-sm); color: var(--color-error); margin-top: 2px; }
        .doc-row-status { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .doc-chunks { font: var(--text-label-sm); color: var(--color-on-surface-variant); }

        /* Icon buttons */
        .icon-btn {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background var(--transition-fast), color var(--transition-fast);
          color: var(--color-on-surface-variant);
        }
        .icon-btn:hover { background: var(--color-surface-container-high); }
        .icon-btn-danger:hover { background: var(--color-error-container); color: var(--color-on-error-container); }

        /* Modal */
        .modal-icon-header { text-align: center; margin-bottom: 24px; }
        .modal-icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-2xl);
          background: var(--color-primary-fixed);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          color: var(--color-primary);
          font-size: 28px;
        }
        .modal-title { font: var(--text-headline-md); color: var(--color-on-surface); margin-bottom: 8px; }
        .modal-sub { font: var(--text-body-sm); color: var(--color-on-surface-variant); line-height: 1.6; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 12px; padding-top: 8px; }
      `}</style>
    </div>
  );
};
