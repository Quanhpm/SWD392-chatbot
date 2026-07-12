import { useRef } from 'react';
import { useApp } from '../context/AppContext.js';
import { useChat } from '../context/ChatContext.js';
import * as chatApi from '../services/chatApi.js';
import type { IChatSession, IQuotaStatus } from '../types/index.js';

export const useChatSession = () => {
  const { state: appState, dispatch: appDispatch, refreshSessions } = useApp();
  const { state: chatState, dispatch: chatDispatch } = useChat();
  const sendInFlightRef = useRef(false);

  const setError = (message: string | null) => {
    chatDispatch({ type: 'SET_ERROR', payload: message });
  };

  const startNewSession = async (documentId?: string, title?: string): Promise<IChatSession> => {
    setError(null);
    chatDispatch({ type: 'SET_LOADING', payload: true });
    try {
      if (!documentId) {
        throw new Error('Vui lòng chọn tài liệu trước khi tạo phiên chat.');
      }

      const session = await chatApi.createSession(documentId, title);
      appDispatch({ type: 'ADD_SESSION', payload: session });
      appDispatch({ type: 'SET_ACTIVE_SESSION', payload: session._id });
      chatDispatch({ type: 'SET_MESSAGES', payload: [] });
      return session;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create chat session';
      setError(msg);
      throw err;
    } finally {
      chatDispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadSessionDetails = async (id: string): Promise<boolean> => {
    setError(null);
    chatDispatch({ type: 'SET_LOADING', payload: true });
    try {
      const session = await chatApi.getSessionById(id);
      appDispatch({ type: 'ADD_SESSION', payload: session });
      appDispatch({ type: 'SET_ACTIVE_SESSION', payload: id });
      chatDispatch({ type: 'SET_MESSAGES', payload: session.messages });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat details');
      appDispatch({ type: 'SET_ACTIVE_SESSION', payload: null });
      return false;
    } finally {
      chatDispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const removeSession = async (id: string) => {
    setError(null);
    try {
      await chatApi.deleteSession(id);
      appDispatch({ type: 'REMOVE_SESSION', payload: id });
      if (appState.activeSessionId === id) {
        chatDispatch({ type: 'CLEAR_CHAT' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
      throw err;
    }
  };

  const postMessage = async (text: string, documentId?: string): Promise<IQuotaStatus | null> => {
    if (sendInFlightRef.current) return null;
    sendInFlightRef.current = true;
    let currentSessionId = appState.activeSessionId;

    setError(null);
    chatDispatch({ type: 'SET_LOADING', payload: true });

    try {
      // 1. Create a session first if there isn't an active one
      if (!currentSessionId) {
        if (!documentId) {
          throw new Error('Vui lòng chọn tài liệu trước khi đặt câu hỏi.');
        }

        const newSess = await chatApi.createSession(documentId);
        currentSessionId = newSess._id;
        appDispatch({ type: 'ADD_SESSION', payload: newSess });
        appDispatch({ type: 'SET_ACTIVE_SESSION', payload: currentSessionId });
      }

      // 2. Optimistically add user message to list
      const userMessage = {
        role: 'user' as const,
        content: text,
        createdAt: new Date().toISOString(),
      };
      chatDispatch({ type: 'ADD_MESSAGE', payload: userMessage });

      // 3. Post to API to orchestrate RAG pipeline
      const response = await chatApi.sendMessage(currentSessionId, text);
      chatDispatch({ type: 'ADD_MESSAGE', payload: response.reply });

      // 4. Refresh Sidebar session list so the auto-title changes show up immediately
      await refreshSessions();
      return response.quota ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      setError(msg);
      return null;
    } finally {
      chatDispatch({ type: 'SET_LOADING', payload: false });
      sendInFlightRef.current = false;
    }
  };

  return {
    sessions: appState.sessions,
    activeSessionId: appState.activeSessionId,
    messages: chatState.messages,
    isLoading: chatState.isLoading,
    error: chatState.error,
    startNewSession,
    loadSessionDetails,
    removeSession,
    postMessage,
  };
};
