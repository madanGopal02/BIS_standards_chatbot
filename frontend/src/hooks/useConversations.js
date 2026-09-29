import { useSyncExternalStore } from 'react'

import { conversationStore } from '../services/conversationStore'

/** Read-only view of the conversation store. */
export function useConversations() {
  const { conversations, activeId } = useSyncExternalStore(
    conversationStore.subscribe,
    conversationStore.getSnapshot,
    conversationStore.getSnapshot,
  )

  const activeConversation = conversations.find((c) => c.id === activeId) || null

  return {
    conversations,
    activeId,
    activeConversation,
    messages: activeConversation ? activeConversation.messages : [],
    createConversation: conversationStore.createConversation,
    selectConversation: conversationStore.selectConversation,
    getConversation: conversationStore.getConversation,
    addMessage: conversationStore.addMessage,
    updateMessage: conversationStore.updateMessage,
    setMessages: conversationStore.setMessages,
    setTitle: conversationStore.setTitle,
    deleteConversation: conversationStore.deleteConversation,
    clearCurrentConversation: conversationStore.clearCurrentConversation,
    clearAll: conversationStore.clearAll,
  }
}
