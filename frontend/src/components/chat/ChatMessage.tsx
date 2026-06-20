import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { IChatMessage } from '../../types/index.js';
import { Icon } from '../shared/Icon.js';
import { ChatCitation } from './ChatCitation.js';

interface ChatMessageProps {
  message: IChatMessage;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  // Pre-process assistant text to format inline citation bracket [1] into standard markdown link [[1]](#citation-1)
  const preprocessContent = (text: string) => {
    return text.replace(/\[(\d+)\]/g, '[[$1]](#citation-$1)');
  };

  // Custom components for react-markdown
  const markdownComponents = {
    a: ({ href, children }: any) => {
      if (href && href.startsWith('#citation-')) {
        const citationNumber = href.replace('#citation-', '');
        return (
          <a
            href={href}
            className="inline-citation-pill"
            onClick={(e) => {
              e.preventDefault();
              // Scroll citation into view or highlight it
              const element = document.getElementById(href.substring(1));
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('highlight-flash');
                setTimeout(() => element.classList.remove('highlight-flash'), 2000);
              }
            }}
          >
            {citationNumber}
          </a>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
  };

  if (isUser) {
    return (
      <div className="chat-msg-row user-row flex-center fade-in">
        <div className="user-bubble shadow-sm">{message.content}</div>

        <style>{`
          .user-row {
            justify-content: flex-end;
            margin-bottom: var(--spacing-lg);
            align-self: flex-end;
            width: 100%;
          }
          .user-bubble {
            background-color: var(--color-surface-container-high);
            color: var(--color-on-surface);
            border-radius: 10px 4px 10px 10px;
            padding: 11px 15px;
            max-width: 80%;
            font: var(--text-body-md);
            word-wrap: break-word;
            border: 1px solid var(--color-outline-variant);
          }
        `}</style>
      </div>
    );
  }

  // Assistant Bubble
  return (
    <div className="chat-msg-row assistant-row fade-in">
      {/* Avatar row above content */}
      <div className="assistant-avatar-row flex-center">
        <div className="assistant-avatar flex-center">
          <Icon name="psychology" style={{ fontSize: '16px', color: 'var(--color-primary)' }} />
        </div>
        <span className="assistant-name">Trợ lý tài liệu</span>
      </div>

      {/* Bubble Content Box */}
      <div className="assistant-content-box shadow-sm">
        <div className="markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents as any}
          >
            {preprocessContent(message.content)}
          </ReactMarkdown>
        </div>

        {/* Citation row */}
        {message.citations && message.citations.length > 0 && (
          <ChatCitation citations={message.citations} />
        )}
      </div>

      <style>{`
        .assistant-row {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          width: 100%;
          margin-bottom: var(--spacing-xl);
        }
        .assistant-avatar-row {
          gap: var(--spacing-sm);
          margin-bottom: 8px;
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
          font-weight: 600;
        }
        .assistant-content-box {
          background-color: var(--color-surface);
          padding: 18px;
          border-radius: 4px 10px 10px 10px;
          border: 1px solid var(--color-outline-variant);
          max-width: 95%;
          width: 100%;
        }

        /* Inline citations style inside ReactMarkdown output */
        .inline-citation-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background-color: var(--color-primary-fixed);
          color: var(--color-on-primary-fixed);
          border-radius: var(--radius-md);
          font-size: 11px;
          font-weight: 700;
          padding: 1px 6px;
          margin: 0 3px;
          line-height: 14px;
          transition: background-color var(--transition-fast), color var(--transition-fast);
          cursor: pointer;
          border: 1px solid var(--color-outline-variant);
        }
        .inline-citation-pill:hover {
          background-color: var(--color-primary);
          color: white;
        }

        /* Highlight Flash animation */
        @keyframes flashHighlight {
          0% { background-color: rgba(26, 115, 232, 0.4); transform: scale(1.05); }
          100% { background-color: transparent; transform: scale(1); }
        }
        .highlight-flash {
          animation: flashHighlight 2s ease-out;
          border-radius: var(--radius-lg);
          padding: 4px;
        }
      `}</style>
    </div>
  );
};
