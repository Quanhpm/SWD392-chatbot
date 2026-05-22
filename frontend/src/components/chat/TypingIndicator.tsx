import React from 'react';
import { Icon } from '../shared/Icon.js';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="typing-container fade-in">
      <div className="assistant-avatar-row flex-center">
        <div className="assistant-avatar flex-center">
          <Icon name="psychology" style={{ fontSize: '16px', color: 'var(--color-primary)' }} />
        </div>
        <span className="assistant-name">Research Assistant is thinking...</span>
      </div>

      <div className="thinking-bubble flex-center shadow-sm">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>

      <style>{`
        .typing-container {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          width: 100%;
          gap: 6px;
        }
        .assistant-avatar-row {
          gap: var(--spacing-sm);
        }
        .assistant-avatar {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-full);
          background-color: var(--color-primary-fixed);
          border: 1px solid var(--color-outline-variant);
        }
        .assistant-name {
          font: var(--text-label-md);
          color: var(--color-on-surface-variant);
          font-weight: 500;
          font-style: italic;
        }
        .thinking-bubble {
          background-color: var(--color-surface);
          border: 1px solid rgba(114, 119, 133, 0.2);
          border-radius: 4px 16px 16px 16px;
          padding: 16px 24px;
          gap: 6px;
          height: 48px;
        }
        .dot {
          width: 8px;
          height: 8px;
          background-color: var(--color-primary);
          border-radius: var(--radius-full);
          animation: bounce 1.4s infinite ease-in-out both;
          opacity: 0.7;
        }
        .dot:nth-child(1) { animation-delay: -0.32s; }
        .dot:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
      `}</style>
    </div>
  );
};
