import React from 'react';

interface UploadProgressProps {
  progress: number;
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'failed';
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ progress, status }) => {
  const getStatusLabel = () => {
    if (status === 'uploading') return `Uploading... ${progress}%`;
    if (status === 'processing') return 'Extracting text & generating vector embeddings...';
    if (status === 'success') return 'Upload complete!';
    return 'Upload failed.';
  };

  const getProgressColor = () => {
    if (status === 'failed') return 'var(--color-error)';
    if (status === 'success') return 'var(--color-success)';
    return 'var(--color-primary)';
  };

  return (
    <div className="upload-progress-container">
      <div className="progress-info flex-center">
        <span className="status-label">{getStatusLabel()}</span>
        {status === 'uploading' && <span className="percentage-label">{progress}%</span>}
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{
            width: `${progress}%`,
            backgroundColor: getProgressColor(),
          }}
        />
      </div>

      <style>{`
        .upload-progress-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin: 16px 0;
          width: 100%;
        }
        .progress-info {
          justify-content: space-between;
          font: var(--text-label-md);
        }
        .status-label {
          color: var(--color-on-surface-variant);
          font-weight: 500;
        }
        .percentage-label {
          color: var(--color-primary);
          font-weight: 600;
        }
        .progress-track {
          width: 100%;
          height: 6px;
          background-color: var(--color-surface-container-high);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.3s ease, background-color var(--transition-fast);
        }
      `}</style>
    </div>
  );
};
