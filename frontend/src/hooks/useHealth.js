import { useCallback, useEffect, useRef, useState } from 'react'

import { api } from '../services/api'
import { friendlyErrorMessage } from '../utils/errors'

const POLL_INTERVAL = 30000

const INITIAL = {
  status: 'checking', // checking | online | offline
  configured: false,
  provider: '',
  providerDisplayName: '',
  model: '',
  version: '',
  maxMessageLength: 5000,
}

/**
 * Polls GET /api/health so the header indicator really reflects whether the
 * backend is reachable and whether a provider key is configured.
 */
export function useHealth() {
  const [health, setHealth] = useState(INITIAL)
  const mounted = useRef(true)

  const check = useCallback(async (signal) => {
    try {
      const data = await api.health(signal)
      setHealth({
        status: 'online',
        configured: Boolean(data.configured),
        provider: data.provider,
        providerDisplayName: data.provider_display_name,
        model: data.model,
        version: data.version,
        maxMessageLength: data.max_message_length,
      })
    } catch (error) {
      if (signal?.aborted) return
      setHealth((previous) => ({ ...previous, status: 'offline' }))
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    const controller = new AbortController()
    check(controller.signal)

    const timer = setInterval(() => {
      if (!document.hidden) check()
    }, POLL_INTERVAL)

    const onFocus = () => check()
    window.addEventListener('focus', onFocus)

    return () => {
      mounted.current = false
      controller.abort()
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [check])

  return { ...health, refresh: check }
}
