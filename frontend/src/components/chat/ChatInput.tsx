import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { Icon } from '../shared/Icon.js';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Ask a question about the course materials...',
}) => {
  const { state: appState, dispatch: appDispatch } = useApp();
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const activeDocsCount = appState.documents.filter(
    (doc) => doc.status === 'indexed'
  ).length;

  // Auto-grow textarea rows from 2 to 6 rows
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to calculate scrollHeight accurately
    textarea.style.height = 'auto';

    const scrollHeight = textarea.scrollHeight;
    // Base height for 2 rows is around 48px, max height for 6 rows is around 140px
    const newHeight = Math.min(Math.max(48, scrollHeight), 140);
    textarea.style.height = `${newHeight}px`;
  }, [text]);

  // Setup Web Speech API for voice typing
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setText((prev) => {
            const separator = prev ? ' ' : '';
            return prev + separator + transcript;
          });
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    
    // Focus back on textarea after sending
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter without shift key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please try Google Chrome.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Speech recognition start failed', err);
      }
    }
  };

  const openUploadModal = () => {
    appDispatch({ type: 'SET_UPLOAD_MODAL', payload: true });
  };

  return (
    <div className="chat-input-container shadow-md">
      <div className="textarea-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={2}
        />
      </div>

      <div className="chat-action-bar">
        <div className="action-bar-left">
          <button
            type="button"
            className="action-btn attach-btn flex-center"
            onClick={openUploadModal}
            title="Attach Course Document (PDF, DOCX, PPTX)"
            disabled={disabled}
          >
            <Icon name="attach_file" />
          </button>
          
          <button
            type="button"
            className={`action-btn mic-btn flex-center ${isListening ? 'listening' : ''}`}
            onClick={toggleVoice}
            title={isListening ? 'Stop Listening' : 'Voice Input (Speech-to-Text)'}
            disabled={disabled}
          >
            <Icon name={isListening ? 'mic_active' : 'mic'} style={{ color: isListening ? 'var(--color-error)' : 'inherit' }} />
          </button>

          <span className="action-divider"></span>

          <span className="sources-status flex-center">
            <Icon name="menu_book" style={{ fontSize: '16px', color: 'var(--color-primary)' }} />
            {activeDocsCount === 0 ? (
              <span className="sources-count text-secondary">No active sources</span>
            ) : (
              <span className="sources-count text-primary">
                {activeDocsCount} {activeDocsCount === 1 ? 'source' : 'sources'} active
              </span>
            )}
          </span>
        </div>

        <button
          type="button"
          className="send-btn flex-center"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          title="Send message"
        >
          <Icon name="arrow_upward" />
        </button>
      </div>

      <style>{`
        .chat-input-container {
          background-color: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-2xl);
          padding: 8px 12px;
          margin: 0 auto 24px auto;
          width: 90%;
          max-width: var(--chat-max-width);
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }

        .chat-input-container:focus-within {
          border-color: var(--color-primary);
          box-shadow: var(--shadow-lg);
        }

        .textarea-wrapper {
          width: 100%;
        }

        .chat-textarea {
          width: 100%;
          border: none;
          background: transparent;
          outline: none;
          resize: none;
          padding: 8px 4px;
          font: var(--text-body-lg);
          color: var(--color-on-surface);
          line-height: 1.5;
          min-height: 48px;
          max-height: 140px;
        }

        .chat-textarea::placeholder {
          color: var(--color-outline);
        }

        .chat-textarea:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .chat-action-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid rgba(114, 119, 133, 0.1);
          padding-top: 8px;
        }

        .action-bar-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .action-btn {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          color: var(--color-on-surface-variant);
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }

        .action-btn:hover:not(:disabled) {
          background-color: var(--color-surface-container);
          color: var(--color-primary);
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mic-btn.listening {
          background-color: var(--color-error-container);
          animation: pulseMic 1.5s infinite;
        }

        @keyframes pulseMic {
          0% { box-shadow: 0 0 0 0 rgba(186, 26, 26, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(186, 26, 26, 0); }
          100% { box-shadow: 0 0 0 0 rgba(186, 26, 26, 0); }
        }

        .action-divider {
          width: 1px;
          height: 18px;
          background-color: var(--color-outline-variant);
          margin: 0 4px;
        }

        .sources-status {
          gap: 6px;
          font: var(--text-label-md);
          font-weight: 600;
        }

        .sources-count.text-primary {
          color: var(--color-primary);
        }

        .sources-count.text-secondary {
          color: var(--color-on-surface-variant);
        }

        .send-btn {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          background-color: var(--color-primary);
          color: var(--color-on-primary);
          transition: background-color var(--transition-fast), transform var(--transition-fast), opacity var(--transition-fast);
        }

        .send-btn:hover:not(:disabled) {
          background-color: var(--color-primary-container);
          transform: scale(1.05);
        }

        .send-btn:disabled {
          background-color: var(--color-surface-container-highest);
          color: var(--color-outline);
          cursor: not-allowed;
          transform: none;
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
};
