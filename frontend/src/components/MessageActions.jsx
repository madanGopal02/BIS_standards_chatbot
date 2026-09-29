import { Check, Copy, RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-react'

import { useCopy } from '../hooks/useCopy'
import { showToast } from '../hooks/useToasts'

/** Subtle per-message actions: copy, regenerate, feedback. */
export function MessageActions({ message, onRegenerate, onFeedback, isLast }) {
  const { copied, failed, copy } = useCopy()

  const handleCopy = async () => {
    const ok = await copy(message.content)
    showToast(ok ? 'Copied to clipboard' : 'Could not copy the answer')
  }

  const handleFeedback = (value) => {
    const next = message.feedback === value ? null : value
    onFeedback(message.id, next)
  }

  return (
    <div className="message-actions">
      <button
        type="button"
        className="message-action"
        onClick={handleCopy}
        aria-label="Copy answer to clipboard"
        title="Copy answer"
      >
        {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        <span className="message-action__text">{copied ? 'Copied' : 'Copy'}</span>
      </button>

      {isLast ? (
        <button
          type="button"
          className="message-action"
          onClick={() => onRegenerate(message.id)}
          aria-label="Regenerate this answer"
          title="Regenerate answer"
        >
          <RefreshCw size={14} aria-hidden="true" />
          <span className="message-action__text">Regenerate</span>
        </button>
      ) : null}

      <span className="message-actions__spacer" />

      <button
        type="button"
        className={`message-action message-action--icon${message.feedback === 'up' ? ' is-active' : ''}`}
        onClick={() => handleFeedback('up')}
        aria-label="This answer was helpful"
        aria-pressed={message.feedback === 'up'}
        title="Helpful"
      >
        <ThumbsUp size={14} aria-hidden="true" />
      </button>

      <button
        type="button"
        className={`message-action message-action--icon${message.feedback === 'down' ? ' is-active' : ''}`}
        onClick={() => handleFeedback('down')}
        aria-label="This answer was not helpful"
        aria-pressed={message.feedback === 'down'}
        title="Not helpful"
      >
        <ThumbsDown size={14} aria-hidden="true" />
      </button>

      {failed ? <span className="message-action__hint">Copy failed</span> : null}
    </div>
  )
}

export default MessageActions
