import { ArrowUp, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { APP_INFO, MAX_INPUT_LENGTH } from '../utils/constants'

const MAX_TEXTAREA_HEIGHT = 200

/**
 * Auto-growing chat input.
 * Enter sends, Shift + Enter inserts a newline, the send button is disabled
 * while the assistant is answering (a Stop button cancels instead).
 */
export function ChatInput({ onSend, onCancel, isLoading, disabled }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const next = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)
    textarea.style.height = `${next}px`
    textarea.style.overflowY = textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden'
  }, [value])

  const trimmed = value.trim()
  const canSend = trimmed.length > 0 && !isLoading && !disabled

  const handleSubmit = () => {
    if (!canSend) return
    const message = trimmed
    setValue('')
    onSend(message)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      handleSubmit()
    }
  }

  const remaining = MAX_INPUT_LENGTH - value.length

  return (
    <div className="chat-input">
      <div className={`chat-input__box${disabled ? ' chat-input__box--disabled' : ''}`}>
        <label htmlFor="chat-input" className="sr-only">
          {APP_INFO.inputPlaceholder}
        </label>
        <textarea
          id="chat-input"
          ref={textareaRef}
          className="chat-input__field"
          rows={1}
          value={value}
          placeholder={APP_INFO.inputPlaceholder}
          onChange={(event) => setValue(event.target.value.slice(0, MAX_INPUT_LENGTH))}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-describedby="chat-input-hint"
        />

        {isLoading ? (
          <button
            type="button"
            className="chat-input__button chat-input__button--stop"
            onClick={onCancel}
            aria-label="Stop generating"
            title="Stop generating"
          >
            <Square size={15} fill="currentColor" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="chat-input__button"
            onClick={handleSubmit}
            disabled={!canSend}
            aria-label="Send message"
            title="Send (Enter)"
          >
            <ArrowUp size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="chat-input__meta" id="chat-input-hint">
        <span>Enter to send · Shift + Enter for a new line</span>
        {remaining <= 400 ? (
          <span className={remaining <= 0 ? 'chat-input__count chat-input__count--warn' : 'chat-input__count'}>
            {remaining} characters left
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default ChatInput
