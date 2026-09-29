import { Info } from 'lucide-react'
import { useEffect, useRef } from 'react'

/** Accessible confirmation dialog (clear history actions). */
export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel, tone = 'default' }) {
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    cancelRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog__icon" aria-hidden="true">
          <Info size={18} />
        </div>
        <h2 className="dialog__title" id="dialog-title">
          {title}
        </h2>
        <p className="dialog__description" id="dialog-description">
          {description}
        </p>
        <div className="dialog__actions">
          <button type="button" className="button button--ghost" onClick={onCancel} ref={cancelRef}>
            Cancel
          </button>
          <button
            type="button"
            className={`button ${tone === 'danger' ? 'button--danger' : 'button--primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
