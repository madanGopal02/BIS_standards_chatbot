import { useEffect, useRef } from 'react'

import { MessageBubble } from './MessageBubble'

/**
 * The scrollable transcript. `role="log"` + `aria-live` makes it
 * screen-reader friendly while staying silent for the user bubble.
 */
export function MessageList({ messages, onRegenerate, onFeedback, onRetry }) {
  const endRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    // Only follow the conversation when the user is already near the bottom.
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight
    if (distanceFromBottom < 220) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages])

  return (
    <div
      className="message-list"
      ref={containerRef}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Conversation"
    >
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          isLast={index === messages.length - 1}
          onRegenerate={onRegenerate}
          onFeedback={onFeedback}
          onRetry={onRetry}
        />
      ))}
      <div ref={endRef} />
    </div>
  )
}

export default MessageList
