/** Date helpers used to group conversations in the sidebar. */

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function dayKey(value) {
  const date = new Date(value)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** "Today" | "Yesterday" | "3 Mar 2026" */
export function formatGroupLabel(value) {
  const date = new Date(value)
  const today = startOfDay(new Date())
  const target = startOfDay(date)
  const diffDays = Math.round((today - target) / DAY_MS)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}

/** Short relative time for a conversation row. */
export function formatRelativeTime(value) {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return formatGroupLabel(date)
}

/**
 * Group conversations into Today / Yesterday / Earlier buckets.
 * @param {Array<{updatedAt: string|number}>} conversations
 */
export function groupConversations(conversations) {
  const groups = new Map()
  for (const conversation of conversations) {
    const label = formatGroupLabel(conversation.updatedAt)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(conversation)
  }
  return Array.from(groups, ([label, items]) => ({ label, items }))
}
