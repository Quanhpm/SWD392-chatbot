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
            className="suggestion-chip text-truncate"
            onClick={() => onSuggestClick(prompt)}
            title={prompt}
          >
            {prompt}
          </button>
        ))}
      </div>

      <style>{`
        .chat-welcome {
          margin: auto;
          text-align: center;
          gap: 16px;
          padding: 24px;
          max-width: var(--chat-max-width);
          height: 100%;
          justify-content: center;
        }
        .welcome-icon-box {
          width: 64px;
          height: 64px;
          background-color: var(--color-surface-container-highest);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-sm);
        }
        .welcome-title {
          font: var(--text-headline-md);
          font-weight: 600;
          color: var(--color-on-surface);
        }
        .welcome-subtitle {
          font: var(--text-body-lg);
          color: var(--color-on-surface-variant);
          max-width: 448px;
          line-height: 1.5;
        }
        .suggestions-container {
          flex-direction: column;
          gap: 8px;
          width: 100%;
          max-width: 500px;
          margin-top: 12px;
        }
        .suggestion-chip {
          width: 100%;
          background-color: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-xl);
          padding: 12px 18px;
          font: var(--text-body-md);
          font-weight: 500;
          color: var(--color-on-surface-variant);
          text-align: left;
          transition: background-color var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
          cursor: pointer;
        }
        .suggestion-chip:hover {
          background-color: var(--color-surface-container-low);
          border-color: var(--color-primary);
          transform: translateY(-1px);
          color: var(--color-primary);
        }
      `}</style>
    </div>
  );
};
