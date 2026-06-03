import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.js';
import { useAuth } from '../context/AuthContext.js';
import { ChatProvider, useChat } from '../context/ChatContext.js';
import { useChatSession } from '../hooks/useChatSession.js';
import { ChatMessageList } from '../components/chat/ChatMessageList.js';
import { ChatInput } from '../components/chat/ChatInput.js';
import { QuotaIndicator } from '../components/chat/QuotaIndicator.js';
import { ErrorToast } from '../components/shared/ErrorToast.js';
import { getDocumentQuota } from '../services/subscriptionApi.js';
import type { IDocument, IQuotaStatus } from '../types/index.js';

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

  // Resolve initial documentId from router state or first available document.
  const routerDocumentId = (location.state as { documentId?: string } | null)?.documentId ?? null;
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(routerDocumentId);
  const [quota, setQuota] = useState<IQuotaStatus | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);

  const documents = appState.documents as IDocument[];
  const role = authState.user?.role;

  const availableDocuments = documents.filter((doc) => doc.status === 'indexed');
  const sessionDocumentId = appState.sessions.find((session) => session._id === activeSessionId)?.documentId;
  const quotaDocumentId = sessionDocumentId ?? activeDocumentId;

  const refreshQuota = useCallback(async (documentId: string) => {
    if (role !== 'student') return;

    try {
      setQuotaLoading(true);
      setQuota(await getDocumentQuota(documentId));
    } catch (err) {
      console.error('Failed to load question quota:', err);
    } finally {
      setQuotaLoading(false);
    }
  }, [role]);

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

  useEffect(() => {
    const firstDocument = availableDocuments[0];
    if (!activeDocumentId && !activeSessionId && firstDocument) {
      setActiveDocumentId(firstDocument._id);
    }
  }, [activeDocumentId, activeSessionId, availableDocuments]);

  useEffect(() => {
    if (sessionDocumentId) {
      setActiveDocumentId(sessionDocumentId);
    }
  }, [sessionDocumentId]);

  useEffect(() => {
    if (role === 'student' && quotaDocumentId) {
      void refreshQuota(quotaDocumentId);
    } else {
      setQuota(null);
    }
  }, [quotaDocumentId, refreshQuota, role]);

  const handleDocumentChange = (documentId: string) => {
    setActiveDocumentId(documentId);
    appDispatch({ type: 'SET_ACTIVE_SESSION', payload: null });
    chatDispatch({ type: 'CLEAR_CHAT' });
    navigate('/chat');
  };

  const handleSend = async (text: string) => {
    if (!activeDocumentId) {
      chatDispatch({ type: 'SET_ERROR', payload: 'Vui lòng chọn tài liệu trước khi đặt câu hỏi.' });
      return;
    }

    const nextQuota = await postMessage(text, activeDocumentId);
    if (nextQuota) {
      setQuota(nextQuota);
    } else if (role === 'student' && quotaDocumentId) {
      await refreshQuota(quotaDocumentId);
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

      {/* Document selector bar */}
      {availableDocuments.length > 0 && (
        <div className="chat-subject-bar">
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-primary)' }}>description</span>
          <span className="chat-subject-label">Tài liệu đang hỏi:</span>
          <div className="chat-subject-chips">
            {availableDocuments.map((doc) => (
              <button
                key={doc._id}
                className={`chat-subject-chip ${activeDocumentId === doc._id ? 'active' : ''}`}
                onClick={() => handleDocumentChange(doc._id)}
              >
                Chương {doc.chapter}: {doc.chapterTitle}
              </button>
            ))}
          </div>
        </div>
      )}

      {availableDocuments.length === 0 && (
        <div className="chat-subject-bar">
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-outline)' }}>info</span>
          <span className="chat-subject-label">Chưa có tài liệu đã lập chỉ mục để hỏi đáp.</span>
        </div>
      )}

      {role === 'student' && (
        <QuotaIndicator quota={quota} loading={quotaLoading} />
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
        <ChatInput
          onSend={handleSend}
          disabled={!activeDocumentId || isLoading || (role === 'student' && quota?.allowed === false)}
        />
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
