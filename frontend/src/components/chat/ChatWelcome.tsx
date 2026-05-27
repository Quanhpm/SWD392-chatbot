import React from 'react';
import { Icon } from '../shared/Icon.js';

interface ChatWelcomeProps {
  onSuggestClick: (prompt: string) => void;
}

export const ChatWelcome: React.FC<ChatWelcomeProps> = ({ onSuggestClick }) => {
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
      <h2 className="welcome-title">Tôi có thể hỗ trợ nghiên cứu gì cho bạn?</h2>
      <p className="welcome-subtitle">
        Đặt câu hỏi về tài liệu môn SE1939, yêu cầu tóm tắt nội dung, hoặc khám phá các khái niệm Software Modeling.
      </p>

      <div className="suggestions-container flex-center">
        {suggestions.map((prompt) => (
          <button
            key={prompt}
            className="suggestion-chip"
            onClick={() => onSuggestClick(prompt)}
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
          background-color: var(--color-surface-container-highest);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-sm);
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
          margin-top: 16px;
        }
        .suggestion-chip {
          width: 100%;
          background-color: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-xl);
          padding: 12px 16px;
          font: var(--text-body-sm);
          font-weight: 500;
          color: var(--color-on-surface-variant);
          text-align: left;
          transition: all var(--transition-fast);
          cursor: pointer;
          white-space: normal !important;
          word-break: break-word !important;
          line-height: 1.4 !important;
          box-shadow: var(--shadow-sm);
        }
        .suggestion-chip:hover {
          background-color: var(--color-surface-container-low);
          border-color: var(--color-primary);
          transform: translateY(-2px);
          color: var(--color-primary);
          box-shadow: var(--shadow-md);
        }
      `}</style>
    </div>
  );
};
