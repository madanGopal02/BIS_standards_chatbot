/**
 * Brand mark: an abstract tricolor + standards-document symbol.
 * Deliberately NOT the official BIS logo and not a government emblem.
 */
export function LogoMark({ size = 34, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="BIS Standards AI logo"
      focusable="false"
    >
      <rect x="1" y="1" width="62" height="62" rx="15" fill="var(--logo-bg)" />
      <rect
        x="1"
        y="1"
        width="62"
        height="62"
        rx="15"
        fill="none"
        stroke="var(--logo-border)"
        strokeWidth="1.6"
      />

      {/* tricolor bands */}
      <rect x="12" y="13" width="6" height="16" rx="2" fill="var(--saffron)" />
      <rect x="12" y="33" width="6" height="6" rx="2" fill="var(--logo-band-white)" />
      <rect x="12" y="43" width="6" height="8" rx="2" fill="var(--india-green)" />

      {/* standards document */}
      <path
        d="M25 14h22a3 3 0 0 1 3 3v34a3 3 0 0 1-3 3H25a3 3 0 0 1-3-3V17a3 3 0 0 1 3-3Z"
        fill="var(--logo-sheet)"
        stroke="var(--navy)"
        strokeWidth="2"
      />
      <rect x="28" y="24" width="16" height="2.5" rx="1.25" fill="var(--navy)" opacity="0.7" />
      <rect x="28" y="31" width="16" height="2.5" rx="1.25" fill="var(--navy)" opacity="0.45" />
      <rect x="28" y="38" width="10" height="2.5" rx="1.25" fill="var(--navy)" opacity="0.3" />

      {/* verified / answered badge */}
      <circle cx="46.5" cy="47.5" r="7.5" fill="var(--logo-bg)" stroke="var(--india-green)" strokeWidth="2" />
      <path
        d="m43 47.6 2.6 2.8 4.6-5.5"
        fill="none"
        stroke="var(--india-green)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default LogoMark
