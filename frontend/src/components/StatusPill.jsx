import { Loader2, Moon, Sun, WifiOff } from 'lucide-react'

/**
 * Header status indicator.
 * checking -> "Checking…", online -> "Ready", offline -> "Offline".
 */
export function StatusPill({ health }) {
  const { status } = health

  let tone = 'pending'
  let label = 'Checking…'
  let title = 'Getting ready…'
  let Icon = Loader2

  if (status === 'offline') {
    tone = 'offline'
    label = 'Offline'
    title = 'Unable to connect right now. Please try again.'
    Icon = WifiOff
  } else if (status === 'online') {
    tone = 'online'
    label = 'Ready'
    title = 'Ready'
    Icon = null
  }

  return (
    <span className={`status-pill status-pill--${tone}`} title={title}>
      {Icon ? <Icon size={13} aria-hidden="true" className={tone === 'pending' ? 'spin' : ''} /> : <span className="status-dot" aria-hidden="true" />}
      <span className="status-pill__label">{label}</span>
      <span className="sr-only" role="status">
        {label}
      </span>
    </span>
  )
}

/** Light / dark theme toggle used in the header. */
export function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      type="button"
      className="icon-button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  )
}

export default StatusPill
