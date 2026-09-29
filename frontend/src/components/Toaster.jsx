import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react'

import { dismissToast, useToasts } from '../hooks/useToasts'

const ICONS = {
  default: Info,
  success: CircleCheck,
  warning: TriangleAlert,
}

/** Lightweight toast notifications (bottom right). */
export function Toaster() {
  const toasts = useToasts()
  if (toasts.length === 0) return null

  return (
    <div className="toaster" role="region" aria-label="Notifications">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.tone] || ICONS.default
        return (
          <div key={toast.id} className={`toast toast--${toast.tone}`} role="status">
            <Icon size={16} aria-hidden="true" />
            <span>{toast.message}</span>
            <button
              type="button"
              className="toast__close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default Toaster
