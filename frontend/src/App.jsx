import { useCallback, useEffect, useState } from 'react'

import { AshokaWatermark } from './components/AshokaWatermark'
import { ConfirmDialog } from './components/ConfirmDialog'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Toaster } from './components/Toaster'
import { useChat } from './hooks/useChat'
import { useConversations } from './hooks/useConversations'
import { useHealth } from './hooks/useHealth'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useTheme } from './hooks/useTheme'
import { showToast } from './hooks/useToasts'
import { ChatPage } from './pages/ChatPage'
import { SettingsPage } from './pages/SettingsPage'
import { APP_INFO } from './utils/constants'

export default function App() {
  const conversations = useConversations()
  const health = useHealth()
  const { theme, setTheme, toggleTheme, isDark } = useTheme()
  const { isLoading, sendMessage, regenerate, cancel } = useChat(conversations)

  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [view, setView] = useState('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const { messages, activeId, conversations: allConversations } = conversations

  /* ----------------------------------------------------------------- */
  /* Actions                                                            */
  /* ----------------------------------------------------------------- */
  const handleNewChat = useCallback(() => {
    conversations.createConversation('New Chat')
    setView('chat')
    setSidebarOpen(false)
  }, [conversations])

  const handleSelectConversation = useCallback(
    (conversationId) => {
      conversations.selectConversation(conversationId)
      setView('chat')
      setSidebarOpen(false)
    },
    [conversations],
  )

  const handleSend = useCallback(
    async (text) => {
      if (!text.trim()) return
      await sendMessage(text)
    },
    [sendMessage],
  )

  const handleSelectPrompt = useCallback(
    (prompt) => {
      if (isLoading) return
      sendMessage(prompt)
    },
    [isLoading, sendMessage],
  )

  const handleFeedback = useCallback(
    (messageId, value) => {
      if (!activeId) return
      conversations.updateMessage(activeId, messageId, { feedback: value })
    },
    [activeId, conversations],
  )

  const handleClearCurrent = useCallback(() => {
    if (!activeId) return
    conversations.clearCurrentConversation(activeId)
    showToast('Current chat cleared', { tone: 'success' })
  }, [activeId, conversations])

  const handleClearAll = useCallback(() => {
    conversations.clearAll()
    showToast('All chat history cleared', { tone: 'success' })
  }, [conversations])

  /* ----------------------------------------------------------------- */
  /* Shortcuts & responsive behaviour                                   */
  /* ----------------------------------------------------------------- */
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        handleNewChat()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleNewChat])

  useEffect(() => {
    if (isDesktop) setSidebarOpen(false)
  }, [isDesktop])

  useEffect(() => {
    if (!isDesktop) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDesktop])

  const sidebarVisible = isDesktop ? true : sidebarOpen

  return (
    <div className={`app${sidebarVisible ? ' app--with-sidebar' : ''}`}>
      <AshokaWatermark />
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <Header
        health={health}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onNewChat={handleNewChat}
        onOpenSidebar={() => setSidebarOpen((open) => !open)}
        onOpenSettings={() => setView('settings')}
        onCloseSettings={() => setView('chat')}
        isSettingsOpen={view === 'settings'}
      />

      <div className="app__body">
        <Sidebar
          open={sidebarVisible}
          isMobile={!isDesktop}
          conversations={allConversations}
          activeId={activeId}
          onSelect={handleSelectConversation}
          onNewChat={handleNewChat}
          onDelete={conversations.deleteConversation}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="app__main" id="main-content">
          {view === 'settings' ? (
            <SettingsPage
              theme={theme}
              setTheme={setTheme}
              onBack={() => setView('chat')}
              onClearCurrentChat={() => setConfirm('current')}
              onClearAllChats={() => setConfirm('all')}
              hasCurrentChat={messages.length > 0}
              hasAnyChat={allConversations.length > 0}
            />
          ) : (
            <ChatPage
              messages={messages}
              isLoading={isLoading}
              health={health}
              onSend={handleSend}
              onCancel={cancel}
              onSelectPrompt={handleSelectPrompt}
              onRegenerate={regenerate}
              onFeedback={handleFeedback}
              onRetry={regenerate}
            />
          )}

          <footer className="app__footer">
            <p>{APP_INFO.footer}</p>
            <p className="app__footer-meta">
              {APP_INFO.name} · {APP_INFO.version} · Educational answers only — verify compliance
              details against the latest official BIS publication.
            </p>
          </footer>
        </main>
      </div>

      <ConfirmDialog
        open={confirm === 'current'}
        title="Clear this chat?"
        description="All messages in the current conversation will be removed from this browser."
        confirmLabel="Clear chat"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null)
          handleClearCurrent()
        }}
      />

      <ConfirmDialog
        open={confirm === 'all'}
        title="Clear all chat history?"
        description="Every saved conversation will be deleted from this browser. This cannot be undone."
        confirmLabel="Clear everything"
        tone="danger"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null)
          handleClearAll()
        }}
      />

      <Toaster />
    </div>
  )
}
