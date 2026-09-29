/**
 * API client.
 *
 * The browser only ever talks to the FastAPI backend:
 *
 *   frontend  ->  POST /api/chat  ->  FastAPI  ->  AI provider
 *
 * There is no API key anywhere in this file, and no request is ever made
 * directly to OpenAI, Groq or Google.
 */

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

/** Abort a request that hangs for longer than this (milliseconds). */
const REQUEST_TIMEOUT = 120000

export class ApiError extends Error {
  constructor(code, message, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

async function request(path, { signal, method = 'GET', body, timeout = REQUEST_TIMEOUT } = {}) {
  const controller = new AbortController()
  let timedOut = false

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeout)

  const forwardAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) forwardAbort()
    else signal.addEventListener('abort', forwardAbort, { once: true })
  }

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })

    const contentType = response.headers.get('content-type') || ''
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : null

    if (!response.ok) {
      const error = payload && payload.error ? payload.error : {}
      throw new ApiError(
        error.code || 'unknown',
        error.message || 'The request failed. Please try again.',
        response.status,
      )
    }

    return payload
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error && error.name === 'AbortError') {
      if (timedOut) {
        throw new ApiError('timeout', 'This is taking longer than expected. Please try again.')
      }
      throw new ApiError('aborted', 'Request cancelled.')
    }
    // Backend unreachable, CORS blocked, server not started, DNS failure...
    throw new ApiError('backend_unavailable', 'Unable to connect right now. Please try again.')
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', forwardAbort)
  }
}

export const api = {
  /** GET /api/health - used for the readiness indicator. */
  health(signal) {
    return request('/api/health', { signal, timeout: 8000 })
  },

  /** POST /api/chat */
  sendMessage({ message, conversationId, history = [] }, signal) {
    return request('/api/chat', {
      method: 'POST',
      body: {
        message,
        conversation_id: conversationId || undefined,
        history,
      },
      signal,
    })
  },
}

export { BASE_URL as API_BASE_URL }
