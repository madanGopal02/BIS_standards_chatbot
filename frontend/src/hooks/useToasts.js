import { useSyncExternalStore } from 'react'

/** Minimal toast store so any component can raise a notification. */

let toasts = []
let nextId = 1
const listeners = new Set()
const timers = new Map()

function emit() {
  toasts = [...toasts]
  listeners.forEach((listener) => listener())
}

export function showToast(message, { tone = 'default', duration = 2600 } = {}) {
  if (!message) return
  const id = nextId++
  toasts = [...toasts, { id, message, tone }]
  emit()
  const timer = setTimeout(() => dismissToast(id), duration)
  timers.set(id, timer)
}

export function dismissToast(id) {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
  toasts = toasts.filter((toast) => toast.id !== id)
  emit()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return toasts
}

export function useToasts() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
