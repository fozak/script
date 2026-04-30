// ============================================================
// CW-url.js
// URL ↔ CW.run serialization
//
// cwStateFromUrl()      — parse URL → fire fresh root CW.run
// cwStateToUrl(run_doc) — serialize run_doc intent fields → URL
//
// Field list derived from CW.run factory — CW.RUN_FIELDS
// Bracket notation for nested, flat for scalars
// Dots in keys preserved — never split on '.'
// _resolveAll + schema own all resolution — no whitelist
// ============================================================
 
// ─── CW.RUN_FIELDS ───────────────────────────────────────────────────────────
// Derived once from CW.run factory source.
// Matches every key assigned as `key: op.something` in the run_doc literal.
// Stored on CW so other modules can read it.
 
;(function _deriveCWRunFields() {
  const CW = globalThis.CW
  if (!CW || !CW.run) return
 
  const src     = CW.run.toString()
  // match `key: op.something` inside the run_doc literal
  const matches = src.match(/(\w+)\s*:\s*op\.\w+/g) || []
  const fields  = [...new Set(matches.map(function (m) {
    return m.split(':')[0].trim()
  }))]
 
  CW.RUN_FIELDS = fields
  console.log('✅ CW.RUN_FIELDS derived:', fields)
})()
 
// ─── _isScalar ───────────────────────────────────────────────────────────────
 
function _isScalar(val) {
  return val === null || val === undefined ||
    typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean'
}
 
// ─── _flattenSingleBracket ────────────────────────────────────────────────────
// Defensive: field[]=value or field[0]=value → scalar value
// If parsed result is object with one empty-string or numeric key → unwrap
 
function _flattenSingleBracket(val) {
  if (_isScalar(val)) return val
  if (typeof val === 'object') {
    const keys = Object.keys(val)
    if (keys.length === 1 && (keys[0] === '' || !isNaN(keys[0]))) {
      return val[keys[0]]
    }
  }
  return val
}
 
// ─── _parseBrackets ───────────────────────────────────────────────────────────
// Parses one LHS bracket key + value into out object.
// Splits ONLY on '[' — never on '.' — preserving dot keys like '0.0_1'.
// e.g. "query[where][name]" + "taskxyz" → out.query.where.name = 'taskxyz'
 
function _parseBrackets(raw, val, out) {
  const keys = raw.replace(/\]/g, '').split('[')
  keys.reduce(function (obj, key, i) {
    if (i === keys.length - 1) {
      obj[key] = val
    } else {
      if (obj[key] === undefined || obj[key] === null || typeof obj[key] !== 'object') {
        obj[key] = {}
      }
    }
    return obj[key]
  }, out)
}
 
// ─── _coerceInts ─────────────────────────────────────────────────────────────
// Schema-driven int coercion via CW._config.
// Falls back to known query int fields if config absent.
 
function _coerceInts(op) {
  const intFields = (globalThis.CW?._config?.urlIntFields) ||
    ['perPage', 'page', 'batch']
 
  if (op.query) {
    for (const f of intFields) {
      if (op.query[f] !== undefined) {
        const n = parseInt(op.query[f])
        if (!isNaN(n)) op.query[f] = n
      }
    }
  }
}
 
// ─── cwStateFromUrl ───────────────────────────────────────────────────────────
// Reads URL params → fires one fresh root CW.run.
// Always root — never child. URL hit = new intent.
// Flat params map to CW.RUN_FIELDS scalars.
// Bracket params parse into nested op fields.
// _resolveAll owns all resolution downstream.
 
function cwStateFromUrl() {
  const p  = new URLSearchParams(location.search)
  if (!p.get('target_doctype')) return null
 
  const CW      = globalThis.CW
  const fields  = new Set(CW.RUN_FIELDS || [])
  const op      = {}
 
  for (const [k, v] of p.entries()) {
    if (k.indexOf('[') === -1) {
      // flat param — accept only known CW.RUN_FIELDS keys
      if (fields.has(k)) {
        op[k] = _flattenSingleBracket(v)
      }
    } else {
      // bracket param — parse into op, dots preserved
      _parseBrackets(k, v, op)
    }
  }
 
  // defensive flatten on all top-level bracket-parsed scalars
  for (const k of Object.keys(op)) {
    if (fields.has(k) && !_isScalar(op[k])) {
      op[k] = _flattenSingleBracket(op[k])
    }
  }
 
  _coerceInts(op)
 
  op.options        = op.options || {}
  op.options.render = true
 
  return CW.run(op)
}
 
// ─── _serializeBrackets ───────────────────────────────────────────────────────
// Recursively serializes nested object to bracket notation.
// Empty string preserved — FSM signals are always ''.
// Null/undefined skipped.
 
function _serializeBrackets(prefix, val, p) {
  if (val === undefined || val === null) return
  if (typeof val === 'object' && !Array.isArray(val)) {
    for (const k of Object.keys(val)) {
      _serializeBrackets(prefix + '[' + k + ']', val[k], p)
    }
  } else {
    p.set(prefix, String(val))
  }
}
 
// ─── _pwdFields ──────────────────────────────────────────────────────────────
// Returns set of Password fieldnames for a doctype — schema-driven.
 
function _pwdFields(target_doctype) {
  const schema = globalThis.CW?.Schema?.[target_doctype]
  return new Set(
    (schema?.fields || [])
      .filter(function (f) { return f.fieldtype === 'Password' })
      .map(function (f) { return f.fieldname })
  )
}
 
// ─── cwStateToUrl ─────────────────────────────────────────────────────────────
// Serializes intent fields of boot run_doc → URL.
// Reads field list from CW.RUN_FIELDS — derived from factory.
// Scalars → flat params. Objects → bracket notation.
// Password fields excluded from input via schema.
// Child runs (parent_run_id set) never update URL.
 
function cwStateToUrl(run_doc) {
  if (run_doc.parent_run_id) return
 
  const CW     = globalThis.CW
  const fields = CW.RUN_FIELDS || []
  const pwd    = _pwdFields(run_doc.target_doctype)
  const p      = new URLSearchParams()
 
  for (const field of fields) {
    const val = run_doc[field]
    if (val === undefined || val === null || val === '') continue
 
    if (field === 'input') {
      // strip password fields — schema-driven
      const safe = {}
      for (const [k, v] of Object.entries(val)) {
        if (!pwd.has(k)) safe[k] = v
      }
      if (Object.keys(safe).length) _serializeBrackets('input', safe, p)
      continue
    }
 
    if (field === 'target') continue  // never serialize result data
 
    if (_isScalar(val)) {
      p.set(field, String(val))
    } else if (typeof val === 'object' && Object.keys(val).length) {
      _serializeBrackets(field, val, p)
    }
  }
 
  const qs = p.toString()
  history.pushState({}, '', location.pathname + (qs ? '?' + qs : ''))
}
 
// ─── popstate ────────────────────────────────────────────────────────────────
 
window.addEventListener('popstate', cwStateFromUrl)
 
// ─── Export ──────────────────────────────────────────────────────────────────
 
Object.assign(globalThis, { cwStateFromUrl, cwStateToUrl })
 
console.log('✅ CW-url.js loaded')
