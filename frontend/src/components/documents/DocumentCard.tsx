import React from 'react';
import type { IDocument } from '../../types/index.js';
import { DocumentStatus } from './DocumentStatus.js';
import { Icon } from '../shared/Icon.js';

interface DocumentCardProps {
  document: IDocument;
  onDelete: (id: string) => void;
  canManage?: boolean;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, onDelete, canManage = true }) => {
  const getDocIcon = (type: string) => {
    if (type === 'pdf') return 'picture_as_pdf';
    if (type === 'docx') return 'description';
    if (type === 'pptx') return 'slideshow';
    return 'article';
  };

  const getDocIconColor = (type: string) => {
    if (type === 'pdf') return '#c5221f'; // PDF Red
    if (type === 'docx') return '#1a73e8'; // Word Blue
    if (type === 'pptx') return '#e06000'; // PPTX Orange
    return '#5c5f60';
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isTerminal = document.status === 'indexed' || document.status === 'failed';

  return (
    <tr className="document-card-row fade-in">
      {/* File type icon & Name */}
      <td className="doc-name-cell">
        <div className="flex-center name-container">
          <Icon
            name={getDocIcon(document.fileType)}
            style={{ color: getDocIconColor(document.fileType), fontSize: '20px' }}
          />
          <div className="name-details text-truncate">
            <span className="doc-title text-truncate" title={document.originalName}>
              {document.originalName}
            </span>
            <span className="doc-size">{formatSize(document.fileSize)}</span>
          </div>
        </div>
      </td>

      {/* Course subject */}
      <td className="doc-subject-cell text-truncate" title={document.subject}>
        {document.subject}
      </td>

      {/* Chapter */}
      <td className="doc-chapter-cell text-truncate" title={`Chapter ${document.chapter}: ${document.chapterTitle}`}>
        <span className="chapter-pill">Ch. {document.chapter}</span>
        <span className="chapter-title">{document.chapterTitle}</span>
      </td>

      {/* Status Badge */}
      <td>
        <DocumentStatus status={document.status} />
      </td>

      {/* Chunks */}
      <td className="doc-chunks-cell">
        {document.status === 'indexed' ? (
          <span className="chunk-count">{document.totalChunks} chunks</span>
        ) : (
          <span className="chunk-pending">—</span>
        )}
      </td>

      {/* Uploaded Date */}
      <td className="doc-date-cell">
        {new Date(document.uploadedAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </td>

      {/* Actions */}
      {canManage && (
        <td className="doc-actions-cell">
          {!isTerminal ? (
            <span className="loading-dots">⏳</span>
          ) : (
            <button
              className="delete-card-btn flex-center"
              onClick={() => onDelete(document._id)}
              aria-label="Delete source"
            >
              <Icon name="delete" />
            </button>
          )}
        </td>
      )}

      <style>{`
        .document-card-row {
          border-bottom: 1px solid var(--color-outline-variant);
          transition: background-color var(--transition-fast);
        }
        .document-card-row:hover {
          background-color: var(--color-surface-container-low);
        }
        .document-card-row td {
          padding: 14px 16px;
          vertical-align: middle;
          font: var(--text-body-md);
          color: var(--color-on-surface);
        }
        .doc-name-cell .name-container {
          justify-content: flex-start;
          gap: 12px;
          max-width: 280px;
        }
        .name-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .doc-title {
          font-weight: 600;
          color: var(--color-on-surface);
        }
        .doc-size {
          font: var(--text-label-md);
          color: var(--color-outline);
        }
        .doc-subject-cell {
          max-width: 180px;
          color: var(--color-on-surface-variant);
        }
        .doc-chapter-cell {
          max-width: 220px;
        }
        .chapter-pill {
          background-color: var(--color-surface-container-highest);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-md);
          padding: 2px 6px;
          font: var(--text-label-md);
          font-weight: 600;
          margin-right: 8px;
          color: var(--color-on-surface-variant);
        }
        .chapter-title {
          font-weight: 500;
        }
        .chunk-count {
          font-weight: 600;
          color: var(--color-primary);
        }
        .chunk-pending {
          color: var(--color-outline);
        }
        .doc-date-cell {
          color: var(--color-on-surface-variant);
          font-size: 13px;
        }
        .delete-card-btn {
          color: var(--color-secondary);
          opacity: 0.8;
          transition: opacity var(--transition-fast), color var(--transition-fast);
          padding: 4px;
          border-radius: var(--radius-sm);
        }
        .delete-card-btn:hover {
          color: var(--color-error);
          background-color: var(--color-error-container);
        }
      `}</style>
    </tr>
  );
};
