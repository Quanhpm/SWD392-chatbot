import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.js';
import { ChatProvider, useChat } from '../context/ChatContext.js';
import { useChatSession } from '../hooks/useChatSession.js';
import { ChatMessageList } from '../components/chat/ChatMessageList.js';
import { ChatInput } from '../components/chat/ChatInput.js';
import { ErrorToast } from '../components/shared/ErrorToast.js';

export const ChatPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const { dispatch: appDispatch } = useApp();
  const { dispatch: chatDispatch } = useChat();
  const {
    activeSessionId,
    messages,
    isLoading,
    error,
    loadSessionDetails,
    postMessage,
  } = useChatSession();

  // Keep URL param and context activeSessionId in perfect sync
  useEffect(() => {
    if (sessionId) {
      if (sessionId !== activeSessionId) {
        void loadSessionDetails(sessionId).then((success) => {
          if (!success) {
            navigate('/chat', { replace: true });
          }
        });
      }
    } else {
      // Clear active session if we are at /chat or root
      appDispatch({ type: 'SET_ACTIVE_SESSION', payload: null });
      chatDispatch({ type: 'CLEAR_CHAT' });
    }
  }, [sessionId, activeSessionId, appDispatch, chatDispatch, navigate]);

  // If a message was sent and an activeSessionId was generated, sync URL
  useEffect(() => {
    if (activeSessionId && !sessionId) {
      navigate(`/chat/${activeSessionId}`, { replace: true });
    }
  }, [activeSessionId, sessionId, navigate]);

  const handleSend = async (text: string) => {
    try {
      await postMessage(text);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleSuggestClick = async (prompt: string) => {
    try {
      await postMessage(prompt);
    } catch (err) {
      console.error('Failed to send suggested query:', err);
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

      {/* Message List */}
      <div className="chat-messages-wrapper">
        <ChatMessageList
          messages={messages}
          isLoading={isLoading}
          onSuggestClick={handleSuggestClick}
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
          width: 100%;
          overflow: hidden;
          background-color: var(--color-background);
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
          background-color: transparent;
          border-top: none;
        }
      `}</style>
    </div>
  );
};
