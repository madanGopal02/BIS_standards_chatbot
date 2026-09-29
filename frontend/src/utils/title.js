/**
 * Local chat titles.
 *
 * A title is derived from the first user message with plain string rules - no
 * extra AI call, no network, instant feedback.
 */

const LEADING_PHRASES = [
  'what is the difference between',
  'difference between',
  'what are the differences between',
  'what is meant by',
  'what do you mean by',
  'can you explain',
  'could you explain',
  'please explain',
  'explain me',
  'tell me about',
  'how are Indian Standards developed',
  'how are indian standards developed',
  'what is',
  'what are',
  'what does',
  'how do',
  'how does',
  'explain',
  'define',
  'who is',
  'why is',
  'when is',
  'where is',
  'list',
  'give me',
  'how',
  'what',
  'why',
]

const ACRONYMS = new Set([
  'is',
  'bis',
  'isi',
  'iso',
  'iec',
  'is/iso',
  'is/iec',
  'ais',
  'wpc',
  'cop',
  'bureau',
])

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'of',
  'in',
  'on',
  'for',
  'to',
  'and',
  'or',
  'vs',
  'versus',
  'with',
  'about',
  'me',
  'is',
])

const MAX_TITLE_LENGTH = 48

function stripLeadingPhrase(text) {
  let working = text.trim()
  let changed = true
  while (changed) {
    changed = false
    const lower = working.toLowerCase()
    const match = LEADING_PHRASES.find((phrase) => lower.startsWith(`${phrase} `))
    if (match) {
      working = working.slice(match.length).trim()
      changed = true
    }
  }
  return working
}

function clean(text) {
  return text
    .replace(/[?!.]+/g, ' ')
    .replace(/["'“”‘’`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function capitalizeWord(word) {
  const bare = word.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '')
  if (!bare) return word
  if (ACRONYMS.has(bare.toLowerCase())) {
    return bare.toUpperCase()
  }
  if (STOP_WORDS.has(bare.toLowerCase())) {
    return bare.toLowerCase()
  }
  if (/^[A-Z0-9/.-]+$/.test(word)) return word
  return bare.charAt(0).toUpperCase() + bare.slice(1)
}

function truncate(text, limit = MAX_TITLE_LENGTH) {
  if (text.length <= limit) return text
  const clipped = text.slice(0, limit)
  const lastSpace = clipped.lastIndexOf(' ')
  return `${(lastSpace > limit * 0.6 ? clipped.slice(0, lastSpace) : clipped).trim()}…`
}

/**
 * Turn a first user message into a short conversation title.
 * "What is BIS certification?" -> "BIS Certification"
 */
export function createConversationTitle(message) {
  const original = clean(String(message || ''))
  if (!original) return 'New Chat'

  const stripped = clean(stripLeadingPhrase(original))
  const source = stripped || original
  const titled = source
    .split(' ')
    .map(capitalizeWord)
    .join(' ')

  return truncate(titled) || 'New Chat'
}

export { MAX_TITLE_LENGTH }
