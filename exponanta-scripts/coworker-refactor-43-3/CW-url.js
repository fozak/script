// ============================================================
// CW-url.js
// URL ↔ CW.run serialization
//
// cwStateFromUrl()   — boot run from URL params (once only)
// cwStateToUrl(run_doc) — serialize run_doc back to URL
// ============================================================

// ─── runParams — single source of truth for URL ↔ run_doc mapping ────────────
// Declared in CW._config.runParams (set in CW-config.js)
// Each entry: { path, url, type, default }
//   path    — dot-notation path on run_doc
//   url     — URL param name
//   type    — 'string' | 'int'
//   default — value if param absent (optional)

// ─── Path helpers ─────────────────────────────────────────────────────────────

function _getPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}

function _setPath(obj, path, val) {
  const keys   = path.split('.')
  const last   = keys.pop()
  const target = keys.reduce((o, k) => { o[k] = o[k] ?? {}; return o[k] }, obj)
  target[last] = val
}

// ─── cwStateFromUrl ───────────────────────────────────────────────────────────
// Reads URL params → fires one boot CW.run
// If boot run already exists in CW.runs → fires child run from boot instead
// Returns the run_doc

function cwStateFromUrl() {
  const p      = new URLSearchParams(location.search)
  const dt     = p.get('doctype')
  if (!dt) return null

  const params = globalThis.CW._config.runParams
  const op     = {}

  for (const { path, url, type, default: def } of params) {
    const raw = p.get(url) ?? def
    if (raw === undefined || raw === null) continue
    const val = type === 'int' ? parseInt(raw) : raw
    _setPath(op, path, val)
  }

  op.options = op.options ?? {}
  op.options.render = true

  // find existing boot run — a run with no parent_run_id
  const bootRun = Object.values(globalThis.CW.runs || {})
    .find(r => !r.parent_run_id)

  if (bootRun) {
    // boot run exists — fire as child
    return bootRun.child(op)
  }

  // no boot run yet — fire naked CW.run (the one legitimate boot call)
  return globalThis.CW.run(op)
}

// ─── cwStateToUrl ─────────────────────────────────────────────────────────────
// Serializes boot run_doc back to URL params
// Only called for boot run — never for child runs

function cwStateToUrl(run_doc) {
  // only serialize boot run (no parent)
  if (run_doc.parent_run_id) return

  const p      = new URLSearchParams()
  const params = globalThis.CW._config.runParams

  for (const { path, url } of params) {
    const val = _getPath(run_doc, path)
    if (val !== undefined && val !== null && val !== '') p.set(url, val)
  }

  history.pushState({}, '', location.pathname + '?' + p.toString())
}

// ─── Export ───────────────────────────────────────────────────────────────────

Object.assign(globalThis, { cwStateFromUrl, cwStateToUrl })

console.log('✅ CW-url.js loaded')
