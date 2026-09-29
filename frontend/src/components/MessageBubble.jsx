import { CircleAlert, Sparkles } from 'lucide-react'

import { Markdown } from './Markdown'
import { MessageActions } from './MessageActions'
import { TypingIndicator } from './TypingIndicator'

/** One chat bubble: user on the right, assistant on the left. */
export function MessageBubble({ message, isLast, onRegenerate, onFeedback, onRetry }) {
  const isUser = message.role === 'user'
  const isPending = message.status === 'pending'
  const isError = message.status === 'error'

  return (
    <article
      className={`message message--${isUser ? 'user' : 'assistant'}${
        isError ? ' message--error' : ''
      }`}
      aria-label={isUser ? 'Your question' : 'Assistant answer'}
    >
      {!isUser ? (
        <div className="message__avatar" aria-hidden="true">
          {isError ? <CircleAlert size={16} /> : <Sparkles size={16} />}
        </div>
      ) : null}

      <div className="message__body">
        {isPending ? (
          <div className="message__card message__card--plain">
            <TypingIndicator />
          </div>
        ) : isError ? (
          <div className="message__card message__card--error">
            <p className="message__error-title">Could not get an answer</p>
            <p className="message__error-text">{message.content}</p>
            <button
              type="button"
              className="button button--ghost button--sm"
              onClick={() => onRetry(message.id)}
            >
              <RefreshIcon />
              Try again
            </button>
          </div>
        ) : isUser ? (
          <div className="message__card">
            <p className="message__text">{message.content}</p>
          </div>
        ) : (
          <>
            <div className="message__card message__card--assistant">
              <Markdown>{message.content}</Markdown>
            </div>
            <MessageActions
              message={message}
              isLast={isLast}
              onRegenerate={onRegenerate}
              onFeedback={onFeedback}
            />
          </>
        )}
      </div>
    </article>
  )
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default MessageBubble
