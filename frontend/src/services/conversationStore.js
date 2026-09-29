/**
 * Conversation store (localStorage backed).
 *
 * A tiny external store instead of a state library: `useConversations()`
 * subscribes to it with `useSyncExternalStore`. Swap this file for an API
 * backed store later and the rest of the UI keeps working unchanged.
 */

import { STORAGE_KEYS } from '../utils/constants'
import { createId } from '../utils/id'
import { readValue, writeValue } from '../utils/storage'

const MAX_CONVERSATIONS = 100

function createConversation(initial = {}) {
  const now = Date.now()
  return {
    id: initial.id || createId('conv'),
    title: initial.title || 'New Chat',
    createdAt: initial.createdAt || now,
    updatedAt: initial.updatedAt || now,
    messages: Array.isArray(initial.messages) ? initial.messages : [],
  }
}

function createMessage({ role, content, status = 'sent' }) {
  return {
    id: createId('msg'),
    role,
    content,
    status,
    createdAt: Date.now(),
    feedback: null,
    errorCode: null,
  }
}

function loadState() {
  const saved = readValue(STORAGE_KEYS.conversations, null)
  const conversations = Array.isArray(saved?.conversations) ? saved.conversations : []
  const activeId = conversations.some((c) => c.id === saved?.activeId)
    ? saved.activeId
    : conversations[0]?.id || null

  return {
    conversations: conversations
      .map((conversation) => createConversation(conversation))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_CONVERSATIONS),
    activeId,
  }
}

let state = loadState()
const listeners = new Set()

function persist() {
  writeValue(STORAGE_KEYS.conversations, state)
}

function emit(next) {
  state = next
  persist()
  listeners.forEach((listener) => listener())
}

function mapConversation(conversationId, updater) {
  return state.conversations.map((conversation) =>
    conversation.id === conversationId ? updater(conversation) : conversation,
  )
}

function touch(conversation) {
  return { ...conversation, updatedAt: Date.now() }
}

export const conversationStore = {
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  getSnapshot() {
    return state
  },

  createConversation(title = 'New Chat') {
    const conversation = createConversation({ title })
    const conversations = [conversation, ...state.conversations].slice(0, MAX_CONVERSATIONS)
    emit({ conversations, activeId: conversation.id })
    return conversation.id
  },

  selectConversation(conversationId) {
    if (state.activeId === conversationId) return conversationId
    if (!state.conversations.some((c) => c.id === conversationId)) return state.activeId
    emit({ ...state, activeId: conversationId })
    return conversationId
  },

  getConversation(conversationId) {
    return state.conversations.find((c) => c.id === conversationId) || null
  },

  addMessage(conversationId, message) {
    const full = createMessage(message)
    const conversations = mapConversation(conversationId, (conversation) =>
      touch({ ...conversation, messages: [...conversation.messages, full] }),
    )
    emit({ conversations, activeId: conversationId })
    return full
  },

  updateMessage(conversationId, messageId, patch) {
    const conversations = mapConversation(conversationId, (conversation) =>
      touch({
        ...conversation,
        messages: conversation.messages.map((message) =>
          message.id === messageId ? { ...message, ...patch } : message,
        ),
      }),
    )
    emit({ conversations, activeId: conversationId })
  },

  setMessages(conversationId, messages) {
    const conversations = mapConversation(conversationId, (conversation) =>
      touch({ ...conversation, messages }),
    )
    emit({ conversations, activeId: conversationId })
  },

  setTitle(conversationId, title) {
    const conversations = mapConversation(conversationId, (conversation) =>
      touch({ ...conversation, title }),
    )
    emit({ conversations, activeId: conversationId })
  },

  deleteConversation(conversationId) {
    const conversations = state.conversations.filter((c) => c.id !== conversationId)
    const activeId =
      state.activeId === conversationId ? conversations[0]?.id || null : state.activeId
    emit({ conversations, activeId })
  },

  clearCurrentConversation(conversationId) {
    const conversations = mapConversation(conversationId, (conversation) => ({
      ...conversation,
      messages: [],
      title: 'New Chat',
      updatedAt: Date.now(),
    }))
    emit({ conversations, activeId: conversationId })
  },

  clearAll() {
    emit({ conversations: [], activeId: null })
  },
}

export { createMessage }
