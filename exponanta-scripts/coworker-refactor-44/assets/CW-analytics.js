// ============================================================
// CW-analytics.js — Exponanta
// Content hit tracking + acquisition attribution
//
// Responsibilities:
//   1. On arrival — capture tracked doctype name + UTMs from URL
//   2. If authenticated — write directly to UserPublicProfile
//   3. If anonymous — store in localStorage, wait for cw:auth:change
//   4. On cw:auth:change — flush localStorage to UserPublicProfile
//
// Trackable doctypes configured in CW._config.trackable_doctypes
// Default: ['Content']
//
// Bootstrap exception: reads pb.authStore.isValid at arrival
// (same rule as auth.js — before any CW.run exists)
// After that — all writes go through naked CW.run (analytics exception)
// ============================================================

const ACQUISITION_KEY = 'cw_acquisition'

// ─── _trackableDoctypes ───────────────────────────────────────
// Reads from CW._config.trackable_doctypes — configurable array.
// Default: ['Content']

function _trackableDoctypes() {
  return globalThis.CW?._config?.trackable_doctypes || ['Content']
}

// ─── _readFromUrl ─────────────────────────────────────────────
// Uses CW-url bracket parser conventions — reads target_doctype
// and name from URL params. Captures UTMs as flat params.
// Only tracks if target_doctype is in trackable_doctypes config.
// Returns { [name]: { utm_*, ref, ts } } or null.

function _readFromUrl() {
  const p  = new URLSearchParams(location.search)
  const dt = p.get('target_doctype')
  if (!dt || !_trackableDoctypes().includes(dt)) return null

  // name comes from flat param or bracket notation — check both
  const name = p.get('name') ||
    p.get('query[where][name]') ||
    new URLSearchParams(
      [...p.entries()]
        .filter(([k]) => k === 'query[where][name]')
        .map(([, v]) => ['name', v])
    ).get('name')

  if (!name) return null

  // capture standard UTM params + ref
  const utm = {}
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref']) {
    const val = p.get(key)
    if (val) utm[key] = val
  }

  return {
    [name]: {
      doctype:      dt,
      ...utm,
      ts:           Date.now(),
    }
  }
}

// ─── localStorage helpers ─────────────────────────────────────

function _loadStored() {
  try {
    return JSON.parse(localStorage.getItem(ACQUISITION_KEY) || 'null')
  } catch {
    return null
  }
}

function _saveStored(data) {
  try {
    localStorage.setItem(ACQUISITION_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('[CW-analytics] localStorage write failed:', e)
  }
}

function _clearStored() {
  localStorage.removeItem(ACQUISITION_KEY)
}

// ─── _writeToProfile ──────────────────────────────────────────
// Two naked CW.run calls — analytics bootstrap exception.
// 1. select — fetch existing content_history for first-touch merge
// 2. update — write merged object back
// first-touch wins: existing content keys never overwritten.

async function _writeToProfile(userId, incoming) {
  if (!userId || !incoming) return

  const CW = globalThis.CW
  if (!CW?.run) return

  // fetch current profile — naked CW.run (analytics exception)
  const fetchRun = await CW.run({
    operation:      'select',
    target_doctype: 'UserPublicProfile',
    query:          { where: { owner: userId } },
    view:           'form',
    options:        { render: false },
  })

  if (fetchRun.error) {
    console.warn('[CW-analytics] fetch failed:', fetchRun.error)
    return
  }

  const doc = fetchRun.target?.data?.[0]
  if (!doc) return

  const existing = tryParseJSON(doc.content_history) || {}
    /*? (typeof doc.content_history === 'string'
        ? JSON.parse(doc.content_history)
        : doc.content_history) 
    : {}*/

  // first-touch wins — existing keys not overwritten
  const merged = { ...incoming, ...existing }

  await CW.run({
    operation:      'update',
    target_doctype: 'UserPublicProfile',
    query:          { where: { owner: userId } },
    input:          { content_history: merged },
    options:        { render: false },
  })

  console.log('[CW-analytics] acquisition written:', Object.keys(incoming))
}

// ─── trackContentHit — main entry, called once on page load ───

async function trackContentHit() {
  const incoming = _readFromUrl()
  if (!incoming) return  // doctype not trackable or no name — nothing to track

  // bootstrap exception — check auth before any CW.run exists
  if (globalThis.pb?.authStore?.isValid) {
    const userId = globalThis.pb.authStore.model.id
    await _writeToProfile(userId, incoming).catch(e =>
      console.warn('[CW-analytics] write failed:', e)
    )
    return
  }

  // anonymous — store for later flush on login
  // first-touch: only write if this content key not yet stored
  const stored = _loadStored() || {}
  const key    = Object.keys(incoming)[0]
  if (!stored[key]) {
    _saveStored({ ...stored, ...incoming })
    console.log('[CW-analytics] stored for later:', key)
  }
}

// ─── _onAuthChange — flush stored acquisition on login ────────

async function _onAuthChange() {
  const stored = _loadStored()
  if (!stored) return  // nothing pending

  const userId = globalThis.pb?.authStore?.model?.id
  if (!userId) return  // logout event — ignore

  await _writeToProfile(userId, stored).catch(e =>
    console.warn('[CW-analytics] flush failed:', e)
  )

  _clearStored()
}

// ─── Wire listeners ───────────────────────────────────────────

globalThis.addEventListener('cw:auth:change', _onAuthChange)

// ─── Export ───────────────────────────────────────────────────

Object.assign(globalThis, { trackContentHit })

console.log('✅ CW-analytics.js loaded')

/*

// ── debug: check fetch returns content_history ──
const r = await CW.run({
  operation:      'select',
  target_doctype: 'UserPublicProfile',
  query:          { where: { owner: pb.authStore.model.id } },
  view:           'form',
  options:        { render: false },
})
console.log('content_history from fetch:', r.target?.data?.[0]?.content_history)

// ── now hit with new content ──
history.pushState({}, '', '/empty.html?target_doctype=Content&query[where][name]=contentnew456&utm_source=linkedin&utm_campaign=test2')
await trackContentHit()

// ── verify ──
const r2 = await CW.run({
  operation:      'select',
  target_doctype: 'UserPublicProfile',
  query:          { where: { owner: pb.authStore.model.id } },
  view:           'form',
  options:        { render: false },
})
console.log('content_history after:', r2.target?.data?.[0]?.content_history)*/

