import { APP_INFO } from '../utils/constants'
import { SettingsPanel } from '../components/SettingsPanel'
import { BackToChatButton } from './ChatPage'

/** Settings screen. */
export function SettingsPage({
  theme,
  setTheme,
  onBack,
  onClearCurrentChat,
  onClearAllChats,
  hasCurrentChat,
  hasAnyChat,
}) {
  return (
    <div className="settings-page">
      <div className="settings-page__inner">
        <BackToChatButton onClick={onBack} />
        <h1 className="settings-page__title">Settings</h1>
        <p className="settings-page__subtitle">
          Appearance and local chat data for {APP_INFO.name}.
        </p>

        <SettingsPanel
          theme={theme}
          setTheme={setTheme}
          onClearCurrentChat={onClearCurrentChat}
          onClearAllChats={onClearAllChats}
          hasCurrentChat={hasCurrentChat}
          hasAnyChat={hasAnyChat}
        />
      </div>
    </div>
  )
}

export default SettingsPage
