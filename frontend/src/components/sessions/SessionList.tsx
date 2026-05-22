import React from 'react';
import { SessionItem } from './SessionItem.js';
import { useChatSession } from '../../hooks/useChatSession.js';

export const SessionList: React.FC = () => {
  const { sessions } = useChatSession();

  return (
    <div className="session-list">
      {sessions.length === 0 ? (
        <span className="no-sessions-label">No conversation history</span>
      ) : (
        sessions.map((session) => <SessionItem key={session._id} session={session} />)
      )}

      <style>{`
        .session-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-height: 200px;
          overflow-y: auto;
        }
        .no-sessions-label {
          font: var(--text-body-md);
          color: var(--color-outline);
          padding-left: 8px;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};
