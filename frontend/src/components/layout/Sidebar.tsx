import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext.js';
import { Icon } from '../shared/Icon.js';
import { useDocuments } from '../../hooks/useDocuments.js';
import { SessionList } from '../sessions/SessionList.js';

export const Sidebar: React.FC = () => {
  const { state, dispatch } = useApp();
  const { documents, removeDocument } = useDocuments();
  const navigate = useNavigate();
  const location = useLocation();

  const handleOpenUpload = () => {
    dispatch({ type: 'SET_UPLOAD_MODAL', payload: true });
  };

  const getDocIcon = (type: string) => {
    if (type === 'pdf') return 'picture_as_pdf';
    if (type === 'docx') return 'description';
    if (type === 'pptx') return 'slideshow';
    return 'article';
  };

  const isActive = (path: string) => {
    if (path === '/chat' && (location.pathname === '/' || location.pathname.startsWith('/chat'))) {
      return true;
    }
    return location.pathname === path;
  };

  const handleDocClick = () => {
    navigate('/documents');
  };

  const handleDeleteDoc = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this document and all its chunks?')) {
      try {
        await removeDocument(docId);
      } catch (err) {
        console.error('Deletion failed', err);
      }
    }
  };

  return (
    <aside className={`app-sidebar ${state.sidebarOpen ? 'open' : ''}`}>
      {/* 1. Add Sources button */}
      <button className="add-source-btn flex-center" onClick={handleOpenUpload}>
        <Icon name="add" className="add-icon" />
        <span>Add Sources</span>
      </button>

      {/* 2. Navigation Cluster */}
      <nav className="sidebar-nav">
        <button
          className={`nav-link flex-center ${isActive('/chat') ? 'active' : ''}`}
          onClick={() => navigate('/chat')}
        >
          <Icon name="chat" />
          <span>Notebook Guide</span>
        </button>
        <button
          className={`nav-link flex-center ${isActive('/documents') ? 'active' : ''}`}
          onClick={handleDocClick}
        >
          <Icon name="folder_open" />
          <span>Shared Documents</span>
        </button>
        <button
          className={`nav-link flex-center ${isActive('/test-set') ? 'active' : ''}`}
          onClick={() => navigate('/test-set')}
        >
          <Icon name="analytics" />
          <span>Evaluation Test Set</span>
        </button>
      </nav>

      <div className="divider" />

      {/* 3. Session History List */}
      <div className="sidebar-section-container">
        <h3 className="section-header">Recent History</h3>
        <SessionList />
      </div>

      <div className="divider" />

      {/* 4. Document Vault list */}
      <div className="sidebar-section-container flex-1">
        <h3 className="section-header">Document Vault</h3>
        <div className="doc-vault-list">
          {documents.length === 0 ? (
            <span className="no-docs-label">No indexed sources</span>
          ) : (
            documents.map((doc) => (
              <div
                key={doc._id}
                className="doc-vault-item flex-center fade-in"
                onClick={handleDocClick}
                title={`${doc.originalName} (${doc.status})`}
              >
                <Icon name={getDocIcon(doc.fileType)} className="doc-icon" />
                <span className="doc-name text-truncate">{doc.originalName}</span>
                {doc.status === 'processing' || doc.status === 'uploaded' ? (
                  <span className="spinner-indicator" />
                ) : (
                  <button
                    className="delete-doc-btn flex-center"
                    onClick={(e) => handleDeleteDoc(e, doc._id)}
                    aria-label="Delete document"
                  >
                    <Icon name="delete" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="divider" />

      {/* 5. Footer Cluster */}
      <footer className="sidebar-footer">
        <a className="footer-link flex-center" href="#help">
          <Icon name="help_outline" />
          <span>Help & FAQ</span>
        </a>
        <a className="footer-link flex-center" href="#trash">
          <Icon name="delete_outline" />
          <span>Trash</span>
        </a>
      </footer>

      <style>{`
        .app-sidebar {
          width: var(--sidebar-width);
          background-color: var(--color-surface-container-low);
          border-right: 1px solid var(--color-outline-variant);
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          height: 100%;
          overflow-y: auto;
          gap: 16px;
        }

        /* 1. Add Source Button */
        .add-source-btn {
          width: 100%;
          background-color: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-xl);
          padding: 12px;
          color: var(--color-primary);
          font: var(--text-headline-md);
          font-size: 16px;
          font-weight: 600;
          gap: 8px;
          transition: background-color var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
          box-shadow: var(--shadow-sm);
        }
        .add-source-btn:hover {
          background-color: var(--color-surface-container);
          border-color: var(--color-primary);
          transform: translateY(-1px);
        }
        .add-source-btn:active {
          transform: translateY(0);
        }
        .add-icon {
          color: var(--color-primary);
        }

        /* 2. Navigation Link */
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .nav-link {
          width: 100%;
          justify-content: flex-start;
          padding: 10px 12px;
          gap: 12px;
          color: var(--color-on-surface-variant);
          border-radius: var(--radius-lg);
          transition: background-color var(--transition-fast), color var(--transition-fast);
          font: var(--text-body-md);
          font-weight: 500;
        }
        .nav-link:hover {
          background-color: var(--color-surface-container-high);
          color: var(--color-on-surface);
        }
        .nav-link.active {
          background-color: var(--color-primary-fixed);
          color: var(--color-on-primary-fixed);
          font-weight: 600;
        }

        .divider {
          height: 1px;
          background-color: var(--color-outline-variant);
          margin: 4px 0;
          opacity: 0.5;
        }

        /* Section Container */
        .sidebar-section-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .sidebar-section-container.flex-1 {
          flex: 1;
          overflow-y: auto;
        }
        .section-header {
          font: var(--text-label-md);
          color: var(--color-secondary);
          opacity: 0.8;
          text-transform: uppercase;
          letter-spacing: var(--text-label-md-spacing);
          padding-left: 8px;
        }

        /* Document Vault List */
        .doc-vault-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
        }
        .no-docs-label {
          font: var(--text-body-md);
          color: var(--color-outline);
          padding-left: 8px;
          font-style: italic;
        }
        .doc-vault-item {
          justify-content: flex-start;
          padding: 8px 12px;
          gap: 10px;
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: background-color var(--transition-fast);
          position: relative;
        }
        .doc-vault-item:hover {
          background-color: var(--color-surface-container-high);
        }
        .doc-icon {
          font-size: 18px;
          color: var(--color-secondary);
          transition: color var(--transition-fast);
        }
        .doc-vault-item:hover .doc-icon {
          color: var(--color-primary);
        }
        .doc-name {
          font: var(--text-body-md);
          color: var(--color-on-surface);
          flex: 1;
        }
        .delete-doc-btn {
          color: var(--color-secondary);
          opacity: 0;
          transition: opacity var(--transition-fast), color var(--transition-fast);
          padding: 2px;
          border-radius: var(--radius-sm);
        }
        .delete-doc-btn:hover {
          color: var(--color-error);
          background-color: var(--color-error-container);
        }
        .doc-vault-item:hover .delete-doc-btn {
          opacity: 1;
        }

        /* Spinner for loading docs */
        .spinner-indicator {
          width: 12px;
          height: 12px;
          border: 2px solid var(--color-outline-variant);
          border-top-color: var(--color-primary);
          border-radius: var(--radius-full);
          animation: spin 1s linear infinite;
        }

        /* Footer links */
        .sidebar-footer {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .footer-link {
          justify-content: flex-start;
          padding: 8px 12px;
          gap: 12px;
          color: var(--color-on-surface-variant);
          border-radius: var(--radius-lg);
          transition: background-color var(--transition-fast);
          font: var(--text-body-md);
        }
        .footer-link:hover {
          background-color: var(--color-surface-container-high);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Mobile Responsive overlay drawer logic */
        @media (max-width: 1023.98px) {
          .app-sidebar {
            position: fixed;
            top: var(--header-height);
            left: 0;
            bottom: 0;
            z-index: 100;
            transform: translateX(-100%);
            transition: transform var(--transition-base);
            box-shadow: var(--shadow-lg);
          }
          .app-sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>
    </aside>
  );
};
