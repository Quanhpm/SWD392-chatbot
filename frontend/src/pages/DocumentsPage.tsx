import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { createSubject as apiCreateSubject, deleteSubject as apiDeleteSubject } from '../services/subjectApi.js';
import { DocumentList } from '../components/documents/DocumentList.js';
import { Icon } from '../components/shared/Icon.js';
import { Button } from '../components/shared/Button.js';

export const DocumentsPage: React.FC = () => {
  const { state, dispatch } = useApp();
  const subjects = state.subjects;
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectPassword, setNewSubjectPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateSubject = async () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed || !newSubjectPassword.trim()) return;
    setCreating(true);
    try {
      const created = await apiCreateSubject(trimmed, newSubjectPassword.trim());
      dispatch({ type: 'ADD_SUBJECT', payload: created });
      setActiveSubject(created.name);
      setNewSubjectName('');
      setNewSubjectPassword('');
      setShowNewSubject(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create subject');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (!confirm(`Delete subject "${name}"? This only works if no documents belong to it.`)) return;
    try {
      await apiDeleteSubject(id);
      dispatch({ type: 'REMOVE_SUBJECT', payload: id });
      if (activeSubject === name) setActiveSubject(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete subject');
    }
  };

  return (
    <div className="documents-page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">Course Documents</h1>
        <p className="page-subtitle">
          Upload and manage your syllabus, textbooks, course slides, and reference materials.
          Indexed files are parsed into vector embeddings and made immediately searchable by the chatbot.
        </p>
      </div>

      {/* Subject chips filter */}
      <div className="subject-chips-row">
        <button
          className={`subject-chip ${activeSubject === null ? 'active' : ''}`}
          onClick={() => setActiveSubject(null)}
        >
          <Icon name="apps" style={{ fontSize: '16px' }} />
          All Subjects
        </button>
        {subjects.map((s) => (
          <div key={s._id} className={`subject-chip-wrapper ${activeSubject === s.name ? 'active' : ''}`}>
            <button
              className={`subject-chip ${activeSubject === s.name ? 'active' : ''}`}
              onClick={() => setActiveSubject(activeSubject === s.name ? null : s.name)}
            >
              <Icon name="folder" style={{ fontSize: '16px' }} />
              {s.name}
              <span className="chip-count">
                {state.documents.filter((d) => d.subject === s.name).length}
              </span>
            </button>
            <button
              className="chip-delete-btn"
              onClick={(e) => { e.stopPropagation(); handleDeleteSubject(s._id, s.name); }}
              title="Delete subject"
            >
              <Icon name="close" style={{ fontSize: '14px' }} />
            </button>
          </div>
        ))}
        {showNewSubject ? (
          <div className="inline-new-subject fade-in">
              <input
                type="text"
                className="form-input chip-input"
                placeholder="Tên môn học..."
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                disabled={creating}
                autoFocus
              />
              <input
                type="password"
                className="form-input chip-input"
                placeholder="Mật khẩu..."
                value={newSubjectPassword}
                onChange={(e) => setNewSubjectPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSubject()}
                disabled={creating}
              />
              <Button variant="filled" onClick={handleCreateSubject} disabled={!newSubjectName.trim() || !newSubjectPassword.trim() || creating} loading={creating}>
                Thêm
              </Button>
              <button className="chip-cancel-btn" onClick={() => { setShowNewSubject(false); setNewSubjectName(''); setNewSubjectPassword(''); }}>
                <Icon name="close" style={{ fontSize: '16px' }} />
              </button>
            </div>
        ) : (
          <button className="subject-chip add-chip" onClick={() => setShowNewSubject(true)}>
            <Icon name="add" style={{ fontSize: '16px' }} />
            New Subject
          </button>
        )}
      </div>

      <div className="page-content-card">
        <DocumentList subjectFilter={activeSubject ?? undefined} />
      </div>

      <style>{`
        .documents-page-container {
          padding: var(--page-margin);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .page-header {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .page-title {
          font: var(--text-headline-lg);
          color: var(--color-on-surface);
          font-weight: 600;
        }

        .page-subtitle {
          font: var(--text-body-lg);
          color: var(--color-on-surface-variant);
          max-width: 800px;
          line-height: 1.5;
        }

        .subject-chips-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .subject-chip-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .subject-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: var(--radius-full);
          font: var(--text-body-md);
          font-weight: 500;
          border: 1px solid var(--color-outline-variant);
          background-color: var(--color-surface-container-lowest);
          color: var(--color-on-surface-variant);
          cursor: pointer;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }

        .subject-chip:hover {
          border-color: var(--color-primary);
          background-color: var(--color-surface-container);
          color: var(--color-on-surface);
        }

        .subject-chip.active {
          background-color: var(--color-primary);
          color: var(--color-on-primary);
          border-color: var(--color-primary);
          font-weight: 600;
        }

        .subject-chip.add-chip {
          border-style: dashed;
          color: var(--color-primary);
        }
        .subject-chip.add-chip:hover {
          background-color: var(--color-primary-fixed);
        }

        .chip-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: var(--radius-full);
          background-color: rgba(0,0,0,0.08);
          font-size: 11px;
          font-weight: 600;
        }

        .subject-chip.active .chip-count {
          background-color: rgba(255,255,255,0.25);
        }

        .chip-delete-btn {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 20px;
          height: 20px;
          border-radius: var(--radius-full);
          background-color: var(--color-error);
          color: white;
          display: none;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 2px solid var(--color-surface-container-lowest);
        }

        .subject-chip-wrapper:hover .chip-delete-btn {
          display: flex;
        }

        .inline-new-subject {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .chip-input {
          width: 200px;
          padding: 6px 12px;
          font-size: 14px;
        }
        .chip-cancel-btn {
          color: var(--color-secondary);
          padding: 4px;
          border-radius: var(--radius-sm);
        }
        .chip-cancel-btn:hover {
          color: var(--color-error);
        }

        .page-content-card {
          background-color: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-2xl);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-sm);
        }

        @media (max-width: 767.98px) {
          .documents-page-container {
            padding: var(--spacing-md);
            gap: var(--spacing-md);
          }

          .page-title {
            font: var(--text-headline-lg-mobile);
          }

          .page-content-card {
            padding: var(--spacing-md);
          }

          .chip-input {
            width: 140px;
          }
        }
      `}</style>
    </div>
  );
};
