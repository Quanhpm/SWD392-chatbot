import React, { useEffect, useRef } from 'react';
import type { IChatMessage } from '../../types/index.js';
import { ChatMessage } from './ChatMessage.js';
import { ChatWelcome } from './ChatWelcome.js';
import { TypingIndicator } from './TypingIndicator.js';

interface ChatMessageListProps {
  messages: IChatMessage[];
  isLoading: boolean;
  onSuggestClick: (prompt: string) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isLoading,
  onSuggestClick,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to the bottom
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="chat-msg-list" style={{ justifyContent: 'center', minHeight: '100%' }}>
        <ChatWelcome onSuggestClick={onSuggestClick} />
      </div>
    );
  }

  return (
    <div className="chat-msg-list">
      {messages.map((msg, index) => (
        <ChatMessage key={msg._id || index} message={msg} />
      ))}

      {/* Thinking state bubble */}
      {isLoading && <TypingIndicator />}

      <div ref={bottomRef} style={{ height: '1px' }} />

      <style>{`
        .chat-msg-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 24px;
          overflow-y: auto;
          max-width: var(--chat-max-width);
          width: 100%;
          margin: 0 auto;
          gap: var(--spacing-md);
        }
      `}</style>
    </div>
  );
};
