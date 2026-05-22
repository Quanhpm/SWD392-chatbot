import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.js';
import { useChatSession } from '../../hooks/useChatSession.js';
import { Icon } from '../shared/Icon.js';
import type { IChatSession } from '../../types/index.js';

interface SessionItemProps {
  session: IChatSession;
}

export const SessionItem: React.FC<SessionItemProps> = ({ session }) => {
  const navigate = useNavigate();
  const { activeSessionId, removeSession } = useChatSession();
  const { dispatch } = useApp();

  const handleSelect = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR', payload: false }); // Close mobile sidebar if open
    navigate(`/chat/${session._id}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      try {
        await removeSession(session._id);
        navigate('/chat');
      } catch (err) {
        console.error('Delete session failed', err);
      }
    }
  };

  const isSelected = activeSessionId === session._id;

  return (
    <div
      className={`session-item flex-center fade-in ${isSelected ? 'selected' : ''}`}
      onClick={handleSelect}
      title={session.title}
    >
      <Icon name="chat_bubble" className="bubble-icon" />
      <span className="session-title text-truncate">{session.title}</span>
      <button
        className="delete-session-btn flex-center"
        onClick={handleDelete}
        aria-label="Delete chat history"
      >
        <Icon name="close" style={{ fontSize: '16px' }} />
      </button>

      <style>{`
        .session-item {
          justify-content: flex-start;
          padding: 8px 12px;
          gap: 10px;
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }
        .session-item:hover {
          background-color: var(--color-surface-container-high);
        }
        .session-item.selected {
          background-color: var(--color-surface-container);
          font-weight: 500;
        }
        .bubble-icon {
          font-size: 16px;
          color: var(--color-secondary);
        }
        .session-item.selected .bubble-icon {
          color: var(--color-primary);
        }
        .session-title {
          font: var(--text-body-md);
          color: var(--color-on-surface);
          flex: 1;
        }
        .delete-session-btn {
          color: var(--color-secondary);
          opacity: 0;
          transition: opacity var(--transition-fast);
          padding: 2px;
          border-radius: var(--radius-sm);
        }
        .delete-session-btn:hover {
          color: var(--color-error);
          background-color: var(--color-error-container);
        }
        .session-item:hover .delete-session-btn {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};
