import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ICitation } from '../../types/index.js';
import { Icon } from '../shared/Icon.js';

interface ChatCitationProps {
  citations: ICitation[];
  anchorPrefix: string;
}

export const ChatCitation: React.FC<ChatCitationProps> = ({ citations, anchorPrefix }) => {
  const navigate = useNavigate();
  const [activePreview, setActivePreview] = useState<number | null>(null);

  if (!citations || citations.length === 0) return null;

  const handleCitationClick = (cite: ICitation, idx: number) => {
    if (cite.subjectId) {
      navigate(`/study/${cite.subjectId}`, { state: { documentId: cite.documentId } });
      return;
    }
    setActivePreview(activePreview === idx ? null : idx);
  };

  return (
    <div className="citations-outer-container">
      <span className="sources-label">Sources Used</span>
      <div className="citation-cards-row">
        {citations.map((cite, idx) => {
          const pagesLabel =
            cite.pageNumbers.length > 0 ? `p. ${cite.pageNumbers.join(', ')}` : 'Slide/Notes';

          return (
            <div key={`${cite.documentId}-${cite.chunkIndex}-${idx}`} className="citation-wrapper" id={`${anchorPrefix}-${idx + 1}`}>
              <button
                className="citation-card-btn flex-center"
                onClick={() => handleCitationClick(cite, idx)}
                title={cite.subjectId ? `Mở nguồn: ${cite.fileName}` : `Click to view snippet: ${cite.fileName}`}
              >
                <div className="badge-num flex-center">{idx + 1}</div>
                <div className="citation-text-box">
                  <span className="cite-file text-truncate">{cite.fileName}</span>
                  <span className="cite-info">
                    Ch. {cite.chapter} — {pagesLabel}
                  </span>
                </div>
                <Icon name="open_in_new" className="citation-action-icon" />
              </button>

              {/* Snippet Overlay Preview */}
              {activePreview === idx && (
                <div className="snippet-preview-panel fade-in">
                  <div className="snippet-header flex-center">
                    <span className="snippet-score">Similarity: {Math.round(cite.similarityScore * 100)}%</span>
                    <button className="close-snippet-btn" onClick={() => setActivePreview(null)}>
                      <Icon name="close" style={{ fontSize: '14px' }} />
                    </button>
                  </div>
                  <blockquote className="snippet-quote">"{cite.snippetPreview}"</blockquote>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .citations-outer-container {
          margin-top: var(--spacing-md);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sources-label {
          font: var(--text-label-md);
          color: var(--color-outline);
          text-transform: uppercase;
          letter-spacing: var(--text-label-md-spacing);
        }
        .citation-cards-row {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
        }
        .citation-wrapper {
          position: relative;
        }
        .citation-card-btn {
          background-color: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-xl);
          padding: 8px 12px;
          gap: 10px;
          text-align: left;
          transition: border-color var(--transition-fast), background-color var(--transition-fast);
          max-width: 240px;
        }
        .citation-card-btn:hover {
          border-color: rgba(0, 91, 191, 0.5);
          background-color: var(--color-surface-container-low);
        }
        .badge-num {
          width: 20px;
          height: 20px;
          border-radius: var(--radius-full);
          background-color: var(--color-primary-fixed);
          color: var(--color-on-primary-fixed);
          font-size: 10px;
          font-weight: 700;
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }
        .citation-card-btn:hover .badge-num {
          background-color: var(--color-primary);
          color: white;
        }
        .citation-text-box {
          display: flex;
          flex-direction: column;
          gap: 1px;
          flex: 1;
          min-width: 0;
        }
        .cite-file {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-on-surface);
        }
        .cite-info {
          font-size: 10px;
          color: var(--color-on-surface-variant);
          opacity: 0.8;
        }
        .citation-action-icon {
          font-size: 14px;
          color: var(--color-tertiary);
        }

        /* Snippet Preview Overlay */
        .snippet-preview-panel {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 0;
          background-color: var(--color-inverse-surface);
          color: var(--color-inverse-on-surface);
          border-radius: var(--radius-lg);
          padding: 10px 12px;
          box-shadow: var(--shadow-lg);
          z-index: 20;
          width: 280px;
          border: 1px solid var(--color-outline);
        }
        .snippet-header {
          justify-content: space-between;
          font-size: 10px;
          opacity: 0.8;
          margin-bottom: 4px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 2px;
        }
        .snippet-score {
          font-weight: 600;
        }
        .close-snippet-btn {
          color: white;
          background: none;
        }
        .snippet-quote {
          font-size: 11px;
          line-height: 1.4;
          font-style: italic;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};
