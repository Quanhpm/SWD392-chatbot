import React from 'react';
import { DocumentList } from '../components/documents/DocumentList.js';

export const DocumentsPage: React.FC = () => {
  return (
    <div className="documents-page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">Course Documents</h1>
        <p className="page-subtitle">
          Upload and manage your syllabus, textbooks, course slides, and reference materials. 
          Indexed files are parsed into vector embeddings and made immediately searchable by the chatbot.
        </p>
      </div>

      <div className="page-content-card">
        <DocumentList />
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
        }
      `}</style>
    </div>
  );
};
