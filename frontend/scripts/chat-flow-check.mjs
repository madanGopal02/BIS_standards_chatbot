/**
 * Chat flow check.
 *
 * Renders the REAL `useConversations` hook and drives the REAL
 * `conversationStore` against the LIVE dev server, so it catches the whole
 * browser path:  browser (5173) -> vite proxy -> backend (8000) -> AI.
 *
 * Run with:  node scripts/chat-flow-check.mjs
 */

import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'

// The store reads localStorage at import time, so the shim must exist first.
const memory = new Map()
const localStorage = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
  clear: () => memory.clear(),
  key: () => null,
  get length() {
    return memory.size
  },
}
globalThis.localStorage = localStorage
// `utils/storage.js` uses `window.localStorage`, not the global.
globalThis.window = globalThis.window || { localStorage }

const APP_URL = 'http://localhost:5173'
const vite = await createServer({ configFile: 'vite.config.js', server: { middlewareMode: true } })

let failures = 0
const ok = (label) => console.log(`  PASS  ${label}`)
const bad = (label, detail) => {
  failures += 1
  console.log(`  FAIL  ${label}${detail ? ` -> ${detail}` : ''}`)
}

// ---------------------------------------------------------------------------
// 1. Contract: every store member the chat hook uses must be exposed.
// ---------------------------------------------------------------------------
console.log('\n[1] useConversations() exposes everything useChat() needs')

const { conversationStore } = await vite.ssrLoadModule('/src/services/conversationStore.js')
const useConversationsModule = await vite.ssrLoadModule('/src/hooks/useConversations.js')

let exposed = null
function Probe() {
  exposed = useConversationsModule.useConversations()
  return null
}
renderToString(createElement(Probe))

const REQUIRED = [
  'createConversation',
  'selectConversation',
  'getConversation',
  'addMessage',
  'updateMessage',
  'setMessages',
  'setTitle',
  'deleteConversation',
  'clearCurrentConversation',
  'clearAll',
]
for (const name of REQUIRED) {
  if (typeof exposed?.[name] === 'function') ok(`exposed: ${name}()`)
  else bad(`exposed: ${name}()`, 'missing or not a function')
}

// ---------------------------------------------------------------------------
// 2. Runtime: replay the exact sequence useChat.sendMessage() performs.
// ---------------------------------------------------------------------------
console.log('\n[2] send flow through the real store -> 5173 -> 8000')

const store = exposed
const question = process.argv[2] || 'What is the ISI mark?'

const conversationId = store.createConversation('New Chat')
if (!store.getConversation(conversationId)) bad('conversation created', 'not found')
else ok('conversation created')

store.setTitle(conversationId, question.slice(0, 40))
store.addMessage(conversationId, { role: 'user', content: question })
const placeholder = store.addMessage(conversationId, {
  role: 'assistant',
  content: '',
  status: 'pending',
})
if (store.getConversation(conversationId).messages.length === 2) ok('user + pending placeholder added')
else bad('messages added', 'unexpected count')

const res = await fetch(`${APP_URL}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ message: question, conversation_id: conversationId, history: [] }),
})
const data = await res.json()

if (!res.ok) {
  bad('POST /api/chat', `HTTP ${res.status} ${JSON.stringify(data).slice(0, 200)}`)
} else if (typeof data.answer === 'string' && data.answer.trim().length > 0) {
  ok(`answer received (${data.answer.length} chars, model=${data.model})`)
} else {
  bad('answer received', JSON.stringify(data).slice(0, 200))
}

// This is the exact update the hook performs when the request resolves.
store.updateMessage(conversationId, placeholder.id, {
  content: data.answer,
  status: 'sent',
  provider: data.provider,
})

const finalMessages = store.getConversation(conversationId).messages
const assistant = finalMessages.find((m) => m.id === placeholder.id)
if (assistant?.status === 'sent' && assistant.content?.trim()) {
  ok('placeholder replaced with the answer (status=sent)')
} else {
  bad('answer written to store', `status=${assistant?.status} len=${assistant?.content?.length}`)
}

// The answer must also survive a reload (localStorage persistence).
const raw = JSON.parse(globalThis.localStorage.getItem('bis-ai.conversations.v1'))
const persisted = raw.conversations.find((c) => c.id === conversationId)
if (persisted?.messages?.some((m) => m.content?.trim())) ok('answer persisted to localStorage')
else bad('answer persisted to localStorage', 'not found')

// ---------------------------------------------------------------------------
// 3. No developer-facing text leaks into the UI.
// ---------------------------------------------------------------------------
console.log('\n[3] user-visible text is free of developer terms')

const { ERROR_MESSAGES: MESSAGES } = await vite.ssrLoadModule('/src/utils/errors.js')
// Developer-only terms. Deliberately excludes a bare "key" so that legitimate
// prose in a model answer is not flagged.
const BANNED = [
  /api key/i,
  /\.env/i,
  /AI_PROVIDER/i,
  /backend/i,
  /uvicorn/i,
  /port 8000/i,
  /restart the/i,
  /\bgroq\b/i,
  /\bopenai\b/i,
  /\bgemini\b/i,
]
for (const [code, message] of Object.entries(MESSAGES)) {
  const hit = BANNED.find((re) => re.test(message))
  if (hit) bad(`error text "${code}"`, `matched ${hit}`)
}

const sources = [
  '/src/components/StatusPill.jsx',
  '/src/components/SettingsPanel.jsx',
  '/src/components/Hero.jsx',
  '/src/pages/ChatPage.jsx',
  '/src/pages/SettingsPage.jsx',
  '/src/services/api.js',
]
const JSX_TEXT = />([^<>{}]*\b(?:API key|\.env|backend|uvicorn|provider)\b[^<>{}]*)</gi
for (const path of sources) {
  const mod = await vite.ssrLoadModule(path)
  const src = mod.default?.toString?.() || ''
  const hits = [...src.matchAll(JSX_TEXT)].map((m) => m[1].trim())
  if (hits.length) bad(path, hits.join(' | '))
  else ok(`no developer text in ${path.split('/').pop()}`)
}

// ---------------------------------------------------------------------------
// 4. Render the whole app and scan the produced HTML.
// ---------------------------------------------------------------------------
console.log('\n[4] the app renders and the HTML is clean')

// Minimal DOM surface the components touch during render.
globalThis.document = {
  documentElement: { classList: { add() {}, remove() {}, toggle() {} } },
  body: { classList: { add() {}, remove() {}, toggle() {} } },
  head: { appendChild() {} },
  hidden: false,
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {},
}
globalThis.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
})

const { default: App } = await vite.ssrLoadModule('/src/App.jsx')
let html = ''
try {
  html = renderToString(createElement(App))
  ok('App rendered without throwing')
} catch (error) {
  bad('App rendered without throwing', error.message)
}

if (html) {
  for (const re of BANNED) {
    const found = html.match(re)
    if (found) bad(`rendered HTML`, `matched ${re} -> "${found[0]}"`)
  }
  if (!BANNED.some((re) => re.test(html))) ok('rendered HTML has no developer terms')
  if (html.includes('Ask anything about BIS standards')) ok('composer renders')
  if (html.includes('Understand Indian Standards')) ok('hero renders')
}

await vite.close()
console.log(failures === 0 ? '\nALL CHAT FLOW CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)