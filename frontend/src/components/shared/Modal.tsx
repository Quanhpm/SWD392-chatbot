import React, { useEffect } from 'react';
import { Icon } from './Icon.js';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = '560px' }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay flex-center" onClick={onClose}>
      <div
        className="modal-content fade-in"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header flex-center">
          {title && <h2 className="modal-title">{title}</h2>}
          <button className="modal-close flex-center" onClick={onClose} aria-label="Close modal">
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(2px);
          z-index: 999;
          padding: 24px;
        }
        .modal-content {
          background-color: var(--color-surface-container-lowest);
          border-radius: var(--radius-2xl);
          width: 100%;
          border: 1px solid var(--color-outline-variant);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
        }
        .modal-header {
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--color-outline-variant);
        }
        .modal-title {
          font: var(--text-headline-md);
          font-weight: 600;
          color: var(--color-on-surface);
        }
        .modal-close {
          color: var(--color-secondary);
          opacity: 0.8;
          transition: opacity var(--transition-fast), transform var(--transition-fast);
          padding: 4px;
          border-radius: var(--radius-full);
        }
        .modal-close:hover {
          opacity: 1;
          background-color: var(--color-surface-container-high);
          transform: rotate(90deg);
        }
        .modal-body {
          padding: 24px;
        }
      `}</style>
    </div>
  );
};
