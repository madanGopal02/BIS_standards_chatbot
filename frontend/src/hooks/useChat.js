import { useCallback, useEffect, useRef, useState } from 'react'

import { api } from '../services/api'
import { HISTORY_TURNS } from '../utils/constants'
import { friendlyErrorMessage } from '../utils/errors'
import { createConversationTitle } from '../utils/title'

/** Previous turns that are worth sending as context. */
function buildHistory(messages) {
  return messages
    .filter((message) => message.status === 'sent' && message.content.trim())
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-(HISTORY_TURNS * 2))
    .map((message) => ({ role: message.role, content: message.content }))
}

/**
 * All chat sending logic: create/send/regenerate/cancel plus loading state.
 * The conversation store owns persistence; this hook only orchestrates.
 */
export function useChat(conversations) {
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef(null)
  const latest = useRef(conversations)
  latest.current = conversations

  useEffect(
    () => () => {
      abortRef.current?.abort()
    },
    [],
  )

  const sendMessage = useCallback(
    async (rawText, options = {}) => {
      const text = String(rawText || '').trim()
      // Empty input does nothing at all.
      if (!text) return null
      if (abortRef.current) return null

      const store = latest.current
      let conversationId = options.conversationId || store.activeId
      if (!conversationId) conversationId = store.createConversation()

      const conversation = store.getConversation(conversationId)
      const existingMessages = conversation ? conversation.messages : []
      const history = options.history || buildHistory(existingMessages)

      if (existingMessages.length === 0) {
        store.setTitle(conversationId, createConversationTitle(text))
      }

      store.addMessage(conversationId, { role: 'user', content: text })

      const placeholder = store.addMessage(conversationId, {
        role: 'assistant',
        content: '',
        status: 'pending',
      })

      const controller = new AbortController()
      abortRef.current = controller
      setIsLoading(true)

      try {
        const data = await api.sendMessage(
          { message: text, conversationId, history },
          controller.signal,
        )

        const current = latest.current.getConversation(conversationId)
        if (current) {
          const stillPending = current.messages.some((m) => m.id === placeholder.id)
          if (stillPending) {
            latest.current.updateMessage(conversationId, placeholder.id, {
              content: data.answer,
              status: 'sent',
              provider: data.provider,
            })
          }
        }
        return data
      } catch (error) {
        const current = latest.current.getConversation(conversationId)
        if (current) {
          const stillPending = current.messages.some((m) => m.id === placeholder.id)
          if (stillPending) {
            if (error?.code === 'aborted') {
              latest.current.setMessages(
                conversationId,
                current.messages.filter((m) => m.id !== placeholder.id),
              )
            } else {
              latest.current.updateMessage(conversationId, placeholder.id, {
                content: friendlyErrorMessage(error),
                status: 'error',
                errorCode: error?.code || 'unknown',
              })
            }
          }
        }
        return null
      } finally {
        abortRef.current = null
        setIsLoading(false)
      }
    },
    [],
  )

  /** Re-ask the question that produced `assistantMessageId`. */
  const regenerate = useCallback(
    async (assistantMessageId) => {
      if (abortRef.current) return
      const { activeId, getConversation, setMessages } = latest.current
      if (!activeId) return

      const conversation = getConversation(activeId)
      if (!conversation) return

      const index = conversation.messages.findIndex((m) => m.id === assistantMessageId)
      if (index < 1) return

      const userMessage = conversation.messages[index - 1]
      if (userMessage.role !== 'user') return

      const truncated = conversation.messages.slice(0, index - 1)
      setMessages(activeId, truncated)

      await sendMessage(userMessage.content, {
        conversationId: activeId,
        history: buildHistory(truncated),
      })
    },
    [sendMessage],
  )

  /** Retry a failed answer. */
  const retry = useCallback(
    async (assistantMessageId) => {
      await regenerate(assistantMessageId)
    },
    [regenerate],
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { isLoading, sendMessage, regenerate, retry, cancel }
}
