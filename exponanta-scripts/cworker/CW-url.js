// ============================================================
// CW-url.js  v3
// URL ↔ CW.run  +  OS-safe filename codec
//
// cwStateFromUrl()         — URL → CW.run (root only)
// cwStateToUrl(run_doc)    — run_doc → pushState URL
// cwRunToFilename(run_doc) — run_doc → encodeURIComponent string
// cwFilenameToRun(str)     — encoded string → CW.run
//
// Filename codec: encodeURIComponent(bracket-query-string)
//   safe on Windows/Linux/macOS — no custom substitution needed
//   decode: decodeURIComponent → URLSearchParams → cwStateFromUrl logic
//
// Guards:
//   - child runs (parent_run_id)  → never serialized
//   - operation create/delete     → never saved as filename
//   - password fields             → stripped via schema (_pwdFields)
// ============================================================

;(function _deriveCWRunFields() {
  const CW = globalThis.CW
  if (!CW?.run) return
  const matches = CW.run.toString().match(/(\w+)\s*:\s*op\.\w+/g) || []
  CW.RUN_FIELDS = [...new Set(matches.map(m => m.split(':')[0].trim()))]
  console.log('✅ CW.RUN_FIELDS derived:', CW.RUN_FIELDS)
})()

// ─── helpers ─────────────────────────────────────────────────────────────────

function _isScalar(v) {
  return v === null || v === undefined ||
    typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
}

function _flattenSingle(val) {
  if (_isScalar(val)) return val
  const keys = Object.keys(val)
  if (keys.length === 1 && (keys[0] === '' || !isNaN(keys[0]))) return val[keys[0]]
  return val
}

// Splits ONLY on '[' — dots in keys like '1.0_1' preserved
function _parseBrackets(raw, val, out) {
  const keys = raw.replace(/\]/g, '').split('[')
  keys.reduce((obj, key, i) => {
    if (i === keys.length - 1) { obj[key] = val }
    else { if (!obj[key] || typeof obj[key] !== 'object') obj[key] = {} }
    return obj[key]
  }, out)
}

function _coerceInts(op) {
  const intFields = globalThis.CW?._config?.urlIntFields || ['perPage', 'page', 'batch']
  if (!op.query) return
  for (const f of intFields) {
    const n = parseInt(op.query[f])
    if (!isNaN(n)) op.query[f] = n
  }
}

function _pwdFields(target_doctype) {
  const schema = globalThis.CW?.Schema?.[target_doctype]
  return new Set((schema?.fields || [])
    .filter(f => f.fieldtype === 'Password')
    .map(f => f.fieldname))
}

// ─── serialize bracket query string ──────────────────────────────────────────
// Builds raw bracket notation string (not URLSearchParams — avoids + for space)
// Empty string preserved — FSM signals are always ''

function _serializeBrackets(prefix, val, parts) {
  if (val === undefined || val === null) return
  if (typeof val === 'object' && !Array.isArray(val)) {
    for (const k of Object.keys(val)) {
      _serializeBrackets(`${prefix}[${k}]`, val[k], parts)
    }
  } else {
    parts.push(`${prefix}=${String(val)}`)
  }
}

// Builds the full bracket query string from run_doc intent fields
// pwd stripping applied to input
function _buildQS(run_doc) {
  const fields = globalThis.CW?.RUN_FIELDS || []
  const pwd    = _pwdFields(run_doc.target_doctype)
  const parts  = []

  for (const field of fields) {
    const val = run_doc[field]
    if (val === undefined || val === null || val === '') continue
    if (field === 'target') continue

    if (field === 'input') {
      const safe = Object.fromEntries(
        Object.entries(val).filter(([k]) => !pwd.has(k))
      )
      if (Object.keys(safe).length) _serializeBrackets('input', safe, parts)
      continue
    }

    if (_isScalar(val)) {
      parts.push(`${field}=${String(val)}`)
    } else if (typeof val === 'object' && Object.keys(val).length) {
      _serializeBrackets(field, val, parts)
    }
  }

  return parts.join('&')
}

// ─── cwStateFromUrl ───────────────────────────────────────────────────────────

function cwStateFromUrl() {
  const p = new URLSearchParams(location.search)
  if (!p.get('target_doctype')) return null

  const fields = new Set(globalThis.CW?.RUN_FIELDS || [])
  const op = {}

  for (const [k, v] of p.entries()) {
    if (!k.includes('[')) {
      if (fields.has(k)) op[k] = _flattenSingle(v)
    } else {
      _parseBrackets(k, v, op)
    }
  }

  for (const k of Object.keys(op)) {
    if (fields.has(k) && !_isScalar(op[k])) op[k] = _flattenSingle(op[k])
  }

  _coerceInts(op)
  op.options = { ...op.options, render: true }

  return globalThis.CW.run(op)
}

// ─── cwStateToUrl ─────────────────────────────────────────────────────────────

function cwStateToUrl(run_doc) {
  if (run_doc.parent_run_id) return
  const qs = new URLSearchParams(_buildQS(run_doc)).toString()
  history.pushState({}, '', location.pathname + (qs ? '?' + qs : ''))
}

// ─── filename codec ───────────────────────────────────────────────────────────
// encodeURIComponent is the only codec — no custom substitution.
// Guards: child runs and mutating operations never saved.

const _NO_FILENAME_OPS = new Set(['create', 'delete'])

function cwRunToFilename(run_doc) {
  if (run_doc.parent_run_id) return null
  if (_NO_FILENAME_OPS.has(run_doc.operation)) return null
  const qs = _buildQS(run_doc)
  if (!qs) return null
  return encodeURIComponent(qs)
}

function cwFilenameToRun(encoded) {
  const qs   = decodeURIComponent(encoded)
  const p    = new URLSearchParams(qs)
  const fields = new Set(globalThis.CW?.RUN_FIELDS || [])
  const op   = {}

  for (const [k, v] of p.entries()) {
    if (!k.includes('[')) {
      if (fields.has(k)) op[k] = _flattenSingle(v)
    } else {
      _parseBrackets(k, v, op)
    }
  }

  _coerceInts(op)
  op.options = { ...op.options, render: true }

  return globalThis.CW.run(op)
}

// ─── popstate + export ───────────────────────────────────────────────────────

window.addEventListener('popstate', cwStateFromUrl)

Object.assign(globalThis, { cwStateFromUrl, cwStateToUrl, cwRunToFilename, cwFilenameToRun })

console.log('✅ CW-url.js loaded')
