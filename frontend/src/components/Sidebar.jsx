import { MessageSquare, Plus, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { groupConversations, formatRelativeTime } from '../utils/date'
import { showToast } from '../hooks/useToasts'

/**
 * Past chats panel. Conversations are grouped by day and searchable.
 * On mobile it renders as a drawer; on desktop as a fixed column.
 */
export function Sidebar({
  open,
  isMobile,
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onClose,
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return conversations
    return conversations.filter((conversation) => {
      if (conversation.title.toLowerCase().includes(term)) return true
      return conversation.messages.some((message) =>
        message.content.toLowerCase().includes(term),
      )
    })
  }, [conversations, query])

  const groups = useMemo(() => groupConversations(filtered), [filtered])

  const handleDelete = (conversation) => {
    onDelete(conversation.id)
    showToast(`Deleted “${conversation.title}”`)
  }

  return (
    <>
      {isMobile && open ? (
        <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />
      ) : null}

      <aside
        className={`sidebar${open ? ' sidebar--open' : ''}${isMobile ? ' sidebar--drawer' : ''}`}
        aria-label="Past chats"
        id="past-chats-panel"
        {...(isMobile && !open ? { inert: true, 'aria-hidden': 'true' } : {})}
      >
        <div className="sidebar__header">
          <h2 className="sidebar__title">Past Chats</h2>
          {isMobile ? (
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label="Close past chats"
            >
              <X size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <button type="button" className="button button--primary sidebar__new" onClick={onNewChat}>
          <Plus size={16} aria-hidden="true" />
          New Chat
        </button>

        <div className="sidebar__search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats"
            aria-label="Search past chats"
          />
        </div>

        <div className="sidebar__list">
          {groups.length === 0 ? (
            <div className="sidebar__empty">
              <MessageSquare size={22} aria-hidden="true" />
              <p>{query ? 'No chats match your search.' : 'No past chats yet.'}</p>
              {!query ? <span>Start a conversation to see it listed here.</span> : null}
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.label} className="sidebar__group">
                <h3 className="sidebar__group-label">{group.label}</h3>
                <ul className="sidebar__items">
                  {group.items.map((conversation) => {
                    const isActive = conversation.id === activeId
                    return (
                      <li key={conversation.id}>
                        <div
                          className={`chat-item${isActive ? ' chat-item--active' : ''}`}
                        >
                          <button
                            type="button"
                            className="chat-item__main"
                            onClick={() => onSelect(conversation.id)}
                            aria-current={isActive ? 'true' : undefined}
                            title={conversation.title}
                          >
                            <span className="chat-item__title">{conversation.title}</span>
                            <span className="chat-item__meta">
                              {conversation.messages.length} message
                              {conversation.messages.length === 1 ? '' : 's'} ·{' '}
                              {formatRelativeTime(conversation.updatedAt)}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="icon-button icon-button--tiny chat-item__delete"
                            onClick={() => handleDelete(conversation)}
                            aria-label={`Delete conversation: ${conversation.title}`}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        <p className="sidebar__footnote">
          Conversations are stored locally in this browser only.
        </p>
      </aside>
    </>
  )
}

export default Sidebar
