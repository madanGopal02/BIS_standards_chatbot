/** "Thinking..." indicator with animated dots. */
export function TypingIndicator() {
  return (
    <div className="typing" role="status" aria-live="polite">
      <span className="typing__label">Thinking</span>
      <span className="typing__dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="sr-only">The assistant is preparing an answer.</span>
    </div>
  )
}

export default TypingIndicator
