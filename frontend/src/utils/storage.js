/** Tiny, safe localStorage helpers (never throws, even in private mode). */

export function readValue(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeValue(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeValue(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
