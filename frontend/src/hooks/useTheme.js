import { useCallback, useEffect, useState } from 'react'

import { STORAGE_KEYS } from '../utils/constants'
import { readValue, writeValue } from '../utils/storage'

export const THEMES = { light: 'light', dark: 'dark' }

/**
 * Theme handling. LIGHT is the default for this MVP; the dark theme is opt-in
 * and remembered in localStorage.
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    const saved = readValue(STORAGE_KEYS.theme, null)
    return saved === THEMES.dark ? THEMES.dark : THEMES.light
  })

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.style.colorScheme = theme
    writeValue(STORAGE_KEYS.theme, theme)
  }, [theme])

  const setTheme = useCallback((next) => {
    setThemeState(next === THEMES.dark ? THEMES.dark : THEMES.light)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === THEMES.dark ? THEMES.light : THEMES.dark))
  }, [])

  return { theme, setTheme, toggleTheme, isDark: theme === THEMES.dark }
}
