import React, { useEffect } from 'react';
import { Icon } from './Icon.js';

interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({ message, onDismiss, duration = 5000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  return (
    <div className="error-toast flex-center gap-md px-md py-sm rounded-xl shadow-lg border fade-in">
      <Icon name="error" className="error-icon" />
      <span className="error-message text-truncate">{message}</span>
      <button className="dismiss-btn flex-center" onClick={onDismiss} aria-label="Dismiss error">
        <Icon name="close" style={{ fontSize: '18px' }} />
      </button>

      <style>{`
        .error-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background-color: var(--color-error-container);
          color: var(--color-on-error-container);
          border-color: var(--color-error);
          z-index: 1000;
          max-width: 380px;
        }
        .error-icon {
          color: var(--color-error);
        }
        .error-message {
          font: var(--text-body-md);
          flex: 1;
        }
        .dismiss-btn {
          opacity: 0.7;
          transition: opacity var(--transition-fast);
        }
        .dismiss-btn:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};
