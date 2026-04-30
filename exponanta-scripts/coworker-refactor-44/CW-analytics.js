// ============================================================
// CW-analytics.js — Exponanta
// Content hit tracking + acquisition attribution
//
// Responsibilities:
//   1. On arrival — capture Content doc name + UTMs from URL
//   2. If authenticated — write directly to UserPublicProfile
//   3. If anonymous — store in localStorage, wait for cw:auth:change
//   4. On cw:auth:change — flush localStorage to UserPublicProfile
//
// Bootstrap exception: reads pb.authStore.isValid at arrival
// (same rule as auth.js — before any CW.run exists)
// After that — all writes go through CW.run, never raw pb calls
// ============================================================

const ACQUISITION_KEY = 'cw_acquisition';

// ─── Read acquisition data from URL ──────────────────────────

function _readFromUrl() {
  const p    = new URLSearchParams(location.search)
  const dt   = p.get('doctype')
  const name = p.get('name')

  if (dt !== 'Content' || !name) return null

  return {
    [name]: {
      utm_source:   p.get('utm_source')   || null,
      utm_medium:   p.get('utm_medium')   || null,
      utm_campaign: p.get('utm_campaign') || null,
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
  localStorage.setItem(ACQUISITION_KEY, JSON.stringify(data))
}

function _clearStored() {
  localStorage.removeItem(ACQUISITION_KEY)
}

// ─── Write to UserPublicProfile via CW.run ────────────────────

async function _writeToProfile(userId, incoming) {
  if (!userId || !incoming) return

  // fetch current content_history first — merge, don't overwrite
  const fetchRun = await globalThis.CW.run({
    operation:      'select',
    target_doctype: 'UserPublicProfile',
    query:          { where: { owner: userId } },
    options:        { render: false },
    view:           'form',
  })

  if (fetchRun.error) {
    console.warn('[CW-analytics] fetch failed:', fetchRun.error)
    return
  }

  const doc     = fetchRun.target?.data?.[0]
  if (!doc) return

  const existing = doc.content_history
    ? (typeof doc.content_history === 'string'
        ? JSON.parse(doc.content_history)
        : doc.content_history)
    : {}

  // merge — existing keys preserved, new keys added
  // first-touch wins: don't overwrite an existing content key
  const merged = { ...incoming, ...existing }

  await globalThis.CW.run({
    operation:      'update',
    target_doctype: 'UserPublicProfile',
    query:          { where: { owner: userId } },
    input:          { content_history: merged },
    options:        { render: false },
  })

  console.log('[CW-analytics] acquisition written:', Object.keys(incoming))
}

// ─── Main entry — call once on page load ─────────────────────

async function trackContentHit() {
  const incoming = _readFromUrl()
  if (!incoming) return  // not a Content hit — nothing to track

  // bootstrap exception — check auth before any run exists
  if (globalThis.pb?.authStore?.isValid) {
    const userId = globalThis.pb.authStore.model.id
    await _writeToProfile(userId, incoming).catch(e =>
      console.warn('[CW-analytics] write failed:', e)
    )
    return
  }

  // anonymous — store and wait
  // first-touch: only write if nothing stored yet for this content key
  const existing = _loadStored() || {}
  const key      = Object.keys(incoming)[0]
  if (!existing[key]) {
    _saveStored({ ...existing, ...incoming })
    console.log('[CW-analytics] stored for later:', key)
  }
}

// ─── Flush on auth change (login or registration) ─────────────

async function _onAuthChange() {
  const stored = _loadStored()
  if (!stored) return  // nothing pending — user was authenticated at arrival

  const userId = globalThis.pb?.authStore?.model?.id
  if (!userId) return  // auth:change but no user — logout event, ignore

  await _writeToProfile(userId, stored).catch(e =>
    console.warn('[CW-analytics] flush failed:', e)
  )

  _clearStored()
}

// ─── Wire event listener ──────────────────────────────────────

globalThis.addEventListener('cw:auth:change', _onAuthChange)

// ─── Export ───────────────────────────────────────────────────

Object.assign(globalThis, { trackContentHit })

console.log('✅ CW-analytics.js loaded')
