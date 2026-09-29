/**
 * App-wide constants: branding copy, example prompts and limits.
 * Keeping the demo questions in one place makes the landing page and the
 * README-style demo easy to extend.
 */

export const APP_INFO = {
  name: 'BIS Standards AI',
  subtitle: 'Indian Standards Knowledge Assistant',
  tagline: 'AI-powered educational assistant — independent project',
  about: 'AI-powered educational project',
  version: 'MVP 1.0.0',
  disclaimer: 'Not affiliated with or endorsed by BIS.',
  footer: 'AI-powered educational project • Not affiliated with BIS',
  heroTitle: 'Understand Indian Standards.',
  heroSubtitle:
    'Ask questions about BIS, Indian Standards, certification, testing, compliance concepts, and technical terminology.',
  heroDescription:
    'AI-powered educational assistant for exploring BIS-related information.',
  inputPlaceholder: 'Ask anything about BIS standards...',
  thinkingLabel: 'Thinking',
}

/** Demo questions shown on the landing page (section 29 of the brief). */
export const EXAMPLE_PROMPTS = [
  'What is BIS?',
  'What is an Indian Standard?',
  'What is BIS certification?',
  'What is the purpose of IS 456?',
  'What is the difference between IS, IS/ISO and IS/IEC?',
  'How are Indian Standards developed?',
  'What does a BIS standard number mean?',
  'What is the difference between a standard and a regulation?',
]

/** Mirrors MAX_MESSAGE_LENGTH on the backend. */
export const MAX_INPUT_LENGTH = 5000

export const STORAGE_KEYS = {
  conversations: 'bis-ai.conversations.v1',
  theme: 'bis-ai.theme.v1',
}

/** How many previous turns are sent to the backend for context. */
export const HISTORY_TURNS = 10
