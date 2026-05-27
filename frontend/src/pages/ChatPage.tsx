import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.js';
import { useAuth } from '../context/AuthContext.js';
import { ChatProvider, useChat } from '../context/ChatContext.js';
import { useChatSession } from '../hooks/useChatSession.js';
import { ChatMessageList } from '../components/chat/ChatMessageList.js';
import { ChatInput } from '../components/chat/ChatInput.js';
import { ErrorToast } from '../components/shared/ErrorToast.js';
import type { ISubject } from '../types/index.js';

const ChatInner: React.FC = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { state: appState, dispatch: appDispatch } = useApp();
  const { state: authState } = useAuth();
  const { dispatch: chatDispatch } = useChat();
  const {
    activeSessionId,
    messages,
    isLoading,
    error,
    loadSessionDetails,
    postMessage,
  } = useChatSession();

  // Resolve initial subjectId from router state (from StudentPortal) or first enrolled subject
  const routerSubjectId = (location.state as { subjectId?: string } | null)?.subjectId ?? null;
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(routerSubjectId);

  const subjects = appState.subjects as ISubject[];
  const role = authState.user?.role;
  const enrolledIds = new Set(authState.user?.enrolledSubjects ?? []);

  // For students, filter to only enrolled subjects
  const availableSubjects = role === 'teacher'
    ? subjects
    : subjects.filter((s) => enrolledIds.has(s._id));

  // Sync URL ↔ activeSessionId
  useEffect(() => {
    if (sessionId) {
      if (sessionId !== activeSessionId) {
        void loadSessionDetails(sessionId).then((success) => {
          if (!success) navigate('/chat', { replace: true });
        });
      }
    } else {
      appDispatch({ type: 'SET_ACTIVE_SESSION', payload: null });
      chatDispatch({ type: 'CLEAR_CHAT' });
    }
  }, [sessionId, activeSessionId]);

  useEffect(() => {
    if (activeSessionId && !sessionId) {
      navigate(`/chat/${activeSessionId}`, { replace: true });
    }
  }, [activeSessionId, sessionId]);

  const handleSend = async (text: string) => {
    try {
      await postMessage(text, activeSubjectId ?? undefined);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <div className="chat-page-container">
      {error && (
        <ErrorToast
          message={error}
          onDismiss={() => chatDispatch({ type: 'SET_ERROR', payload: null })}
        />
      )}

      {/* Subject selector bar */}
      {availableSubjects.length > 0 && (
        <div className="chat-subject-bar">
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-primary)' }}>school</span>
          <span className="chat-subject-label">Phạm vi kiến thức:</span>
          <div className="chat-subject-chips">
            <button
              className={`chat-subject-chip ${!activeSubjectId ? 'active' : ''}`}
              onClick={() => setActiveSubjectId(null)}
            >
              Tất cả
            </button>
            {availableSubjects.map((s) => (
              <button
                key={s._id}
                className={`chat-subject-chip ${activeSubjectId === s._id ? 'active' : ''}`}
                onClick={() => setActiveSubjectId(s._id)}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message List */}
      <div className="chat-messages-wrapper">
        <ChatMessageList
          messages={messages}
          isLoading={isLoading}
          onSuggestClick={handleSend}
        />
      </div>

      {/* Chat Input */}
      <div className="chat-input-wrapper">
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>

      <style>{`
        .chat-page-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          background: var(--color-background);
        }
        .chat-subject-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 24px;
          background: var(--color-surface-container-lowest);
          border-bottom: 1px solid var(--color-outline-variant);
          flex-wrap: wrap;
        }
        .chat-subject-label {
          font: var(--text-label-md);
          color: var(--color-on-surface-variant);
          white-space: nowrap;
        }
        .chat-subject-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .chat-subject-chip {
          padding: 4px 14px;
          border-radius: var(--radius-full);
          font: var(--text-label-md);
          border: 1.5px solid var(--color-outline-variant);
          color: var(--color-on-surface-variant);
          transition: all var(--transition-fast);
        }
        .chat-subject-chip:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
          background: var(--color-primary-fixed);
        }
        .chat-subject-chip.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }
        .chat-messages-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          position: relative;
        }
        .chat-input-wrapper {
          padding: 8px 0;
          background: transparent;
        }
      `}</style>
    </div>
  );
};

export const ChatPage: React.FC = () => (
  <ChatProvider>
    <ChatInner />
  </ChatProvider>
);
