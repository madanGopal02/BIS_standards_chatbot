import { useCallback, useEffect, useRef, useState } from 'react'

/** Copy text to the clipboard and flash a "Copied" state for a moment. */
export function useCopy(resetAfter = 1800) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = useCallback(
    async (text) => {
      const value = String(text || '')
      if (!value) return false

      let ok = false
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(value)
          ok = true
        } else {
          // Fallback for http://localhost in browsers without the async API.
          const textarea = document.createElement('textarea')
          textarea.value = value
          textarea.setAttribute('readonly', '')
          textarea.style.position = 'fixed'
          textarea.style.opacity = '0'
          document.body.appendChild(textarea)
          textarea.select()
          ok = document.execCommand('copy')
          document.body.removeChild(textarea)
        }
      } catch {
        ok = false
      }

      clearTimeout(timer.current)
      if (ok) {
        setCopied(true)
        setFailed(false)
      } else {
        setFailed(true)
      }
      timer.current = setTimeout(() => {
        setCopied(false)
        setFailed(false)
      }, resetAfter)

      return ok
    },
    [resetAfter],
  )

  return { copied, failed, copy }
}
