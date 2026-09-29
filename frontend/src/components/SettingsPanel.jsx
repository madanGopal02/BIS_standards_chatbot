import { Moon, Sun, Trash2, Eraser } from 'lucide-react'

import { APP_INFO } from '../utils/constants'

/**
 * Settings content: appearance, chat data and about.
 */
export function SettingsPanel({
  theme,
  setTheme,
  onClearCurrentChat,
  onClearAllChats,
  hasCurrentChat,
  hasAnyChat,
}) {
  return (
    <div className="settings">
      <section className="settings__section" aria-labelledby="settings-appearance">
        <h2 className="settings__title" id="settings-appearance">
          Appearance
        </h2>
        <p className="settings__hint">The interface uses a light theme by default.</p>
        <div className="segmented" role="radiogroup" aria-label="Colour theme">
          <button
            type="button"
            role="radio"
            aria-checked={theme === 'light'}
            className={`segmented__option${theme === 'light' ? ' is-selected' : ''}`}
            onClick={() => setTheme('light')}
          >
            <Sun size={15} aria-hidden="true" />
            Light
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={theme === 'dark'}
            className={`segmented__option${theme === 'dark' ? ' is-selected' : ''}`}
            onClick={() => setTheme('dark')}
          >
            <Moon size={15} aria-hidden="true" />
            Dark
          </button>
        </div>
      </section>

      <section className="settings__section" aria-labelledby="settings-chat">
        <h2 className="settings__title" id="settings-chat">
          Chat
        </h2>
        <p className="settings__hint">
          Conversations are stored in this browser only. Clearing them cannot be undone.
        </p>
        <div className="settings__actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={onClearCurrentChat}
            disabled={!hasCurrentChat}
          >
            <Eraser size={15} aria-hidden="true" />
            Clear current chat
          </button>
          <button
            type="button"
            className="button button--danger-ghost"
            onClick={onClearAllChats}
            disabled={!hasAnyChat}
          >
            <Trash2 size={15} aria-hidden="true" />
            Clear all chat history
          </button>
        </div>
      </section>

      <section className="settings__section" aria-labelledby="settings-about">
        <h2 className="settings__title" id="settings-about">
          About
        </h2>
        <dl className="settings__list">
          <div className="settings__row">
            <dt>Application</dt>
            <dd>{APP_INFO.name}</dd>
          </div>
          <div className="settings__row">
            <dt>Purpose</dt>
            <dd>{APP_INFO.about}</dd>
          </div>
          <div className="settings__row">
            <dt>Version</dt>
            <dd>{APP_INFO.version}</dd>
          </div>
        </dl>
        <p className="settings__note settings__note--muted">{APP_INFO.disclaimer}</p>
        <p className="settings__hint">
          For authoritative requirements always consult official sources such as the{' '}
          <a href="https://www.bis.gov.in" target="_blank" rel="noopener noreferrer">
            BIS website
          </a>{' '}
          and the BIS e-sale portal.
        </p>
      </section>
    </div>
  )
}

export default SettingsPanel
