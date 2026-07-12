import React from 'react';
import { Icon } from '../shared/Icon.js';

interface ChatWelcomeProps {
  onSuggestClick: (prompt: string) => void;
  disabled?: boolean;
}

export const ChatWelcome: React.FC<ChatWelcomeProps> = ({ onSuggestClick, disabled = false }) => {
  const suggestions = [
    'Bốn giai đoạn của Unified Process là gì?',
    'Giải thích sự khác nhau giữa include và extend trong use case.',
    'Cho ví dụ thực tế về Strategy Design Pattern.',
    'So sánh High Cohesion và Low Coupling trong software modeling.',
  ];

  return (
    <div className="chat-welcome flex-center flex-col fade-in">
      <div className="welcome-icon-box flex-center">
        <Icon name="auto_awesome" style={{ fontSize: '30px', color: 'var(--color-primary)' }} />
      </div>
      <h2 className="welcome-title">Bạn muốn tìm hiểu điều gì?</h2>
      <p className="welcome-subtitle">
        Câu trả lời được tạo từ nội dung của tài liệu bạn đang chọn và kèm nguồn tham chiếu.
      </p>

      <div className="suggestions-container flex-center">
        {suggestions.map((prompt) => (
          <button
            key={prompt}
            className="suggestion-chip"
            onClick={() => onSuggestClick(prompt)}
            disabled={disabled}
            title={prompt}
          >
            {prompt}
          </button>
        ))}
      </div>

      <style>{`
        .chat-welcome {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          width: 100% !important;
          box-sizing: border-box;
          margin: auto;
          text-align: center;
          gap: 16px;
          padding: 24px;
          max-width: var(--chat-max-width);
          height: 100%;
          justify-content: center;
        }
        .welcome-icon-box {
          width: 56px;
          height: 56px;
          background-color: var(--color-primary-fixed);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-xl);
          flex-shrink: 0;
        }
        .welcome-title {
          font: var(--text-headline-md);
          font-weight: 700;
          color: var(--color-on-surface);
          max-width: 100%;
          word-break: keep-all;
          overflow-wrap: break-word;
        }
        .welcome-subtitle {
          font: var(--text-body-sm);
          color: var(--color-on-surface-variant);
          max-width: 100%;
          line-height: 1.6;
          word-break: keep-all;
          overflow-wrap: break-word;
        }
        .suggestions-container {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 10px;
          width: 100%;
          max-width: 100%;
          margin-top: 10px;
        }
        .suggestion-chip {
          width: 100%;
          background-color: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-lg);
          padding: 10px 13px;
          font: var(--text-body-sm);
          font-weight: 500;
          color: var(--color-on-surface-variant);
          text-align: left;
          transition: all var(--transition-fast);
          cursor: pointer;
          white-space: normal !important;
          word-break: break-word !important;
          line-height: 1.4 !important;
        }
        .suggestion-chip:hover {
          background-color: var(--color-surface-container-low);
          border-color: var(--color-primary);
          color: var(--color-primary);
        }
      `}</style>
    </div>
  );
};
