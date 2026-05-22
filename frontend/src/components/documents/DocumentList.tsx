import React, { useState } from 'react';
import { useDocuments } from '../../hooks/useDocuments.js';
import { useApp } from '../../context/AppContext.js';
import { DocumentCard } from './DocumentCard.js';
import { EmptyState } from '../shared/EmptyState.js';
import { Button } from '../shared/Button.js';
import { Icon } from '../shared/Icon.js';

export const DocumentList: React.FC = () => {
  const { documents, removeDocument } = useDocuments();
  const { dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleOpenUpload = () => {
    dispatch({ type: 'SET_UPLOAD_MODAL', payload: true });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document and all its chunks?')) {
      try {
        await removeDocument(id);
      } catch (err) {
        console.error('Delete failed', err);
      }
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.originalName.toLowerCase().includes(search.toLowerCase()) ||
      doc.chapterTitle.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="document-list-container">
      {/* Search & Filter Bar */}
      <div className="filter-bar flex-center">
        <div className="search-input-wrapper flex-center">
          <Icon name="search" className="search-icon" />
          <input
            type="text"
            className="search-field"
            placeholder="Search documents by filename or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="clear-btn flex-center" onClick={() => setSearch('')}>
              <Icon name="close" style={{ fontSize: '18px' }} />
            </button>
          )}
        </div>

        <div className="filter-controls flex-center">
          <select
            className="form-input form-select status-dropdown"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="uploaded">Uploaded</option>
            <option value="processing">Processing</option>
            <option value="indexed">Indexed</option>
            <option value="failed">Failed</option>
          </select>

          <Button icon="add" onClick={handleOpenUpload}>
            Add Material
          </Button>
        </div>
      </div>

      {/* Documents Table */}
      {filteredDocs.length === 0 ? (
        <EmptyState
          icon={documents.length === 0 ? 'cloud_upload' : 'search_off'}
          title={documents.length === 0 ? 'No documents indexed' : 'No matches found'}
          description={
            documents.length === 0
              ? 'Upload course PDF, DOCX, or PPTX slides to parse and generate embeddings.'
              : 'Try broadening your search terms or changing status filters.'
          }
          action={
            documents.length === 0 ? (
              <Button onClick={handleOpenUpload} icon="add">
                Upload First Material
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="table-responsive">
          <table className="documents-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Subject</th>
                <th>Chapter Info</th>
                <th>Status</th>
                <th>Index Size</th>
                <th>Uploaded</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => (
                <DocumentCard key={doc._id} document={doc} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .document-list-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 100%;
        }
        .filter-bar {
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .search-input-wrapper {
          flex: 1;
          min-width: 280px;
          background-color: var(--color-surface-container-low);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-xl);
          padding: 8px 16px;
          gap: 12px;
          transition: border-color var(--transition-fast), background-color var(--transition-fast);
        }
        .search-input-wrapper:focus-within {
          border-color: var(--color-primary);
          background-color: var(--color-surface-container-lowest);
        }
        .search-icon {
          color: var(--color-secondary);
        }
        .search-field {
          flex: 1;
          background: none;
          border: none;
          font: var(--text-body-md);
          color: var(--color-on-surface);
        }
        .clear-btn {
          color: var(--color-secondary);
        }
        .filter-controls {
          gap: 12px;
        }
        .status-dropdown {
          min-width: 140px;
          background-color: var(--color-surface-container-low);
        }

        .table-responsive {
          width: 100%;
          overflow-x: auto;
          background-color: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-sm);
        }
        .documents-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .documents-table th {
          background-color: var(--color-surface-container-low);
          padding: 14px 16px;
          font: var(--text-label-md);
          color: var(--color-on-surface-variant);
          text-transform: uppercase;
          letter-spacing: var(--text-label-md-spacing);
          border-bottom: 1px solid var(--color-outline-variant);
        }
      `}</style>
    </div>
  );
};
