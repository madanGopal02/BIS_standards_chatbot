/** Friendly, user-facing error messages keyed by backend error code. */

const MESSAGES = {
  empty_message: 'Please type a question before sending.',
  message_too_long: 'Your message is too long. Please shorten it and try again.',
  validation_error: 'The request could not be processed. Please try again.',
  provider_not_configured: 'The assistant is not available right now. Please try again later.',
  invalid_api_key: 'The assistant is not available right now. Please try again later.',
  rate_limited: 'Too many requests just now. Please wait a moment and try again.',
  timeout: 'This is taking longer than expected. Please try again.',
  provider_unavailable: 'The assistant is temporarily unavailable. Please try again.',
  model_unavailable: 'The assistant is temporarily unavailable. Please try again.',
  provider_error: 'The assistant could not answer this question. Please try rephrasing it.',
  empty_response: 'The assistant returned an empty response. Please try again.',
  internal_error: 'Something went wrong on our side. Please try again.',
  backend_unavailable: 'Unable to connect right now. Please try again.',
  aborted: 'Request cancelled.',
  unknown: 'Something went wrong. Please try again.',
}

export function friendlyErrorMessage(error) {
  if (!error) return MESSAGES.unknown
  const code = typeof error === 'string' ? error : error.code
  if (code && MESSAGES[code]) return MESSAGES[code]
  const message = typeof error === 'string' ? error : error.message
  return (message && message.trim()) || MESSAGES.unknown
}

export { MESSAGES as ERROR_MESSAGES }
