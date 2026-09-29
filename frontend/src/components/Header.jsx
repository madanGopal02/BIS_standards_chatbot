import { Menu, MessageSquarePlus, Settings as SettingsIcon } from 'lucide-react'

import { APP_INFO } from '../utils/constants'
import { LogoMark } from './LogoMark'
import { StatusPill, ThemeToggle } from './StatusPill'

/**
 * Top navigation bar: brand on the left, actions on the right.
 */
export function Header({
  health,
  isDark,
  onToggleTheme,
  onNewChat,
  onOpenSidebar,
  onOpenSettings,
  onCloseSettings,
  isSettingsOpen,
}) {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__left">
          <button
            type="button"
            className="icon-button app-header__menu"
            onClick={onOpenSidebar}
            aria-label="Open past chats"
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          <div className="brand">
            <LogoMark size={34} className="brand__mark" />
            <div className="brand__text">
              <span className="brand__name">{APP_INFO.name}</span>
              <span className="brand__subtitle">{APP_INFO.subtitle}</span>
            </div>
          </div>
        </div>

        <nav className="app-header__nav" aria-label="Main">
          <button type="button" className="nav-button" onClick={onNewChat}>
            <MessageSquarePlus size={16} aria-hidden="true" />
            <span>New Chat</span>
          </button>

          <button type="button" className="nav-button nav-button--sidebar" onClick={onOpenSidebar}>
            <span>Past Chats</span>
          </button>

          <button
            type="button"
            className={`nav-button${isSettingsOpen ? ' nav-button--active' : ''}`}
            onClick={isSettingsOpen ? onCloseSettings : onOpenSettings}
            aria-current={isSettingsOpen ? 'page' : undefined}
          >
            <SettingsIcon size={16} aria-hidden="true" />
            <span>Settings</span>
          </button>

          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
          <StatusPill health={health} />
        </nav>
      </div>

      <p className="app-header__note">{APP_INFO.tagline}</p>
    </header>
  )
}

export default Header
