import { ArrowLeft } from 'lucide-react'

import { APP_INFO } from '../utils/constants'
import { ChatInput } from '../components/ChatInput'
import { Hero } from '../components/Hero'
import { MessageList } from '../components/MessageList'

/** The chat screen: hero when empty, transcript otherwise. */
export function ChatPage({
  messages,
  isLoading,
  health,
  onSend,
  onCancel,
  onSelectPrompt,
  onRegenerate,
  onFeedback,
  onRetry,
}) {
  const hasMessages = messages.length > 0
  const isOffline = health.status === 'offline'

  return (
    <div className="chat-page">
      <div className="chat-page__scroll">
        {hasMessages ? (
          <>
            <div className="chat-page__conversation-head">
              <h1 className="chat-page__title">
                {health.configured ? 'Ask about Indian Standards' : 'BIS Standards AI'}
              </h1>
              <p className="chat-page__subtitle">{APP_INFO.heroDescription}</p>
            </div>
            <MessageList
              messages={messages}
              onRegenerate={onRegenerate}
              onFeedback={onFeedback}
              onRetry={onRetry}
            />
          </>
        ) : (
          <Hero onSelectPrompt={onSelectPrompt} />
        )}
      </div>

      <div className="chat-page__composer">
        {isOffline ? (
          <p className="composer-warning" role="status">
            Unable to connect right now. Please try again in a moment.
          </p>
        ) : null}
        <ChatInput onSend={onSend} onCancel={onCancel} isLoading={isLoading} />
      </div>
    </div>
  )
}

export function BackToChatButton({ onClick }) {
  return (
    <button type="button" className="nav-button settings__back" onClick={onClick}>
      <ArrowLeft size={16} aria-hidden="true" />
      <span>Back to chat</span>
    </button>
  )
}

export default ChatPage
