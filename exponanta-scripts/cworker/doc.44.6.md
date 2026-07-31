https://claude.ai/chat/494edfe2-101b-4336-b58c-f9a2e9b6b520


CW D1 Adapter — Architecture Documentation
The Biggest Struggle — Worker as Controller vs Adapter Endpoint
The Problem

Initial Worker implementation called CW.controller on every POST:

javascript
// WRONG — conceptually broken
await CW.controller(run_doc)

This caused a fundamental architectural conflict. Browser CW.run already runs the full controller pipeline:

Browser CW.run
  → _resolveAll
  → _resolveInput  
  → pre-fetch select
  → _logChanges
  → _mergeInput
  → _clearInput
  → _handlers.update → Adapters.d1.update → _post → Worker

By the time _post sends run_doc to Worker, everything is done — target.data[0] is fully merged, validated, ready to persist. Worker calling CW.controller again ran the full pipeline twice:

Second _mergeInput on empty input — nothing to merge
Second _clearInput — cleared input that was already clear
Most critically — Worker's _handlers.select during pre-fetch called _expand which fired child runs, then _clearInput wiped input containing the user's changes before they could be merged

This made status: 'Pending' disappear — input was cleared by Worker before it could be merged into target.data[0].

The Decision

Worker is a pure adapter executor, not a controller. Browser controller owns the full pipeline. Worker just executes the DB operation on the already-prepared run_doc.

Final Worker Code
javascript
if (req.method === 'POST') {
  try {
    const run_doc = await req.json()
    const token   = req.headers.get('Authorization') || ''
    try { run_doc.user = await verifyJWT(token, env.JWT_SECRET) } catch { run_doc.user = {} }

    const adapter = CW._getAdapters(run_doc)[0]
    await globalThis.Adapters[adapter][run_doc.operation]?.(run_doc)

    return Response.json(run_doc, { headers: CORS })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: CORS })
  }
}

No CW.controller. No CW.run. Just Adapters[adapter][operation](run_doc) — adapter executes, mutates run_doc, Worker returns it.

D1 Adapter Key Architecture
Isomorphic Pattern

Every adapter function checks globalThis.env?.DB:

Browser — env.DB undefined → delegates to Worker via _post
Worker — env.DB exists → executes D1 directly

Same function, two execution paths, one codebase.

_post — Browser Transport
javascript
const _post = async (run_doc) => {
  const res = await fetch(cfg().hub.url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: run_doc.user?.token || '' },
    body:    JSON.stringify(run_doc)
  })
  Object.assign(run_doc, await res.json())
}

Sends full run_doc to Worker. Worker executes adapter, mutates run_doc, returns it. Object.assign copies all properties back. Works correctly because Worker only mutates target, error, success — never touches input.

select — Isomorphic Entry Point
javascript
async function select(run_doc) {
  if (!globalThis.env?.DB) {
    await _post(run_doc)
    return
  }

  const doctype = run_doc.target_doctype ?? run_doc.source_doctype
  const { clause, params: filterParams } = _buildFilter(run_doc)
  const aclParams = cfg().sql.aclParams(run_doc.user)
  const sort      = _buildSort(run_doc)
  const limit     = _buildLimit(run_doc)
  const baseSQL   = CW.Schema?.[doctype]?.listSQL?.(cfg()) || cfg().sql.listSQL(cfg())

  const sql = `
    ${baseSQL}
    ${clause ? `AND (${clause})` : ''}
    ORDER BY ${sort}
    ${limit.sql}
  `.trim()

  try {
    const rows = await globalThis.env.DB
      .prepare(sql)
      .bind(...aclParams, ...filterParams, ...limit.params)
      .all()
    run_doc.target  = { data: rows.results.map(_mergeRecord), meta: { total: rows.results.length } }
    run_doc.success = true
  } catch (err) {
    run_doc.error = err.message
  }
}

Browser path — one line _post. Worker path — full D1 query with ACL joins, field filtering, pagination.

update — Optimistic Upsert
javascript
async function update(run_doc) {
  if (!globalThis.env?.DB) { await _post(run_doc); return }

  const doc = run_doc.target?.data?.[0]
  if (!doc?.name) { run_doc.error = '400 update: no target document'; return }

  const { top, data } = _splitRecord(doc)

  try {
    const existing = await globalThis.env.DB
      .prepare(`SELECT data FROM ${cfg().collection} WHERE name = ?`)
      .bind(doc.name).first()

    if (!existing) return create(run_doc)  // upsert — not found → create

    const merged  = { ...JSON.parse(existing.data || '{}'), ...data }
    const topKeys = Object.keys(top)
    const topVals = Object.values(top)
    const setCols = [...topKeys.map(k => `${k} = ?`), 'data = ?'].join(', ')

    await globalThis.env.DB
      .prepare(`UPDATE ${cfg().collection} SET ${setCols} WHERE name = ?`)
      .bind(...topVals, JSON.stringify(merged), doc.name).run()

    run_doc.target  = { data: [_mergeRecord({ ...top, data: merged })], meta: { updated: 1 } }
    run_doc.success = true
  } catch (err) {
    run_doc.error = err.message
  }
}

Key points:

reads existing data blob from D1
merges new fields over existing — partial update, not overwrite
optimistic upsert — if record not found, falls through to create
_splitRecord and _mergeRecord — D1 Specific

Unlike PB adapter, D1 requires explicit JSON serialization of arrays and objects for top-level columns:

javascript
function _splitRecord(doc) {
  const top  = {}
  const data = {}
  for (const [k, v] of Object.entries(doc)) {
    if (CW._config.topLevelFields.has(k) || /^[\w]+[+-]$|^[+-][\w]+$/.test(k) || v instanceof File) {
      top[k] = Array.isArray(v) || (v && typeof v === 'object') ? JSON.stringify(v) : v
    } else {
      data[k] = v
    }
  }
  return { top, data }
}

_allowed, _allowed_read, files are arrays — serialized to JSON strings for TEXT columns. _mergeRecord deserializes them back:

javascript
function _mergeRecord(rec) {
  const raw = rec.data
  const doc = Object.assign({}, typeof raw === 'string' ? JSON.parse(raw || '{}') : raw || {})
  for (const k of CW._config.topLevelFields) {
    if (!(k in rec)) continue
    const v = rec[k]
    if (typeof v === 'string' && (v.startsWith('[') || v.startsWith('{'))) {
      try { doc[k] = JSON.parse(v) } catch { doc[k] = v }
    } else {
      doc[k] = v
    }
  }
  return doc
}
_logChanges — End Fix

_logChanges calls _patchDataField which is PB-specific — calls globalThis.pb which is undefined in D1 context. Original code had doc._changes = next inside the try block — if _patchDataField threw, _changes was never updated in memory.

Fix

Move doc._changes = next outside try/catch so it always runs:

javascript
try {
  await _patchDataField(doc.name, '_changes', entry)
} catch (err) {
  // PB patch failed — D1 relies on in-memory update
  // _changes will be written to D1 via normal update flow
}
doc._changes = next  // ← always runs regardless of patch success

For D1 this works because:

doc._changes = next updates in memory
Controller continues to _handlers.update
_splitRecord(doc) includes _changes in data blob
D1 update merges data over existing — _changes persisted to D1 ✅

For PB — _patchDataField writes _changes immediately to PB, then doc._changes = next updates memory, then pb.update writes it again. No issue — both writes have same data.

Adding New systemField / topLevelField
Rules

topLevelFields — promotes a field from the data JSON blob to a dedicated D1 column:

Add to CW._config.topLevelFields Set
Add column to D1 item table
Add index if queried frequently
_splitRecord automatically routes it to top, _mergeRecord reads it back

systemFields — runs onWrite/onCreate hooks for every record operation:

Order Matters in systemFields

systemFields onCreate hooks run in array order. Dependencies must come first:

javascript
systemFields: [
  { name: 'doctype', onWrite: ... },  // 1. always first
  { name: 'slug',    onCreate: ... }, // 2. slug from title_field
  { name: 'title',   onCreate: ... }, // 3. title from title_field value
  { name: 'name',    onCreate: ... }, // 4. name from slug/autoname ← must be before id
  { name: 'id',      onCreate: ... }, // 5. id = name ← depends on name being set
  ...
]

id must come after name because id onCreate does doc.id = doc.name — if name isn't generated yet, id gets undefined.

hidden: 0 Required

systemFields with hidden: 1 are filtered out by _compileSchemas:

javascript
.filter(sf => sf.fieldtype && (!sf.hidden || sf.in_list_view))

If a systemField needs to be merged into schema.fields (for validation, preflight, UI) — set hidden: 0. The id field required this fix.

Example — Adding id systemField
javascript
{
  name:    'id',
  fetch:   true,
  hidden:  0,        // ← must be 0 to be compiled into schema.fields
  onCreate: (run_doc) => {
    const doc = run_doc.target?.data?.[0]
    if (!doc || doc.id) return
    doc.id = doc.name  // ← doc.name must already be set — order matters
  },
},

And in topLevelFields:

javascript
topLevelFields: new Set([
  "id",    // ← maps to PRIMARY KEY column in D1
  "name",
  ...
])

And D1 table:

sql
CREATE TABLE item (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ...
)

generaate description of struggle with booting data and that we ended up with adding to CW-config

// ── schemas ──────────────────────────────────────────────────
globalThis.CW.Schema = {}
globalThis.CW.Schema['Task'] = {"_schema_doctype":"Task","explicit_edit_intent":0,"_autosave":1,"_state":{"1":

CW._compileSchemas();  // ← add this

for unified loading

Schema Bootstrap — The Boot Problem
The Struggle

The original boot.js loaded schemas from db.json via fetch:

javascript
const docs = await fetch(`${base}/assets/db.json`).then(r => r.json())
globalThis.CW.Schema = {}
for (const s of docs.filter(d => d.doctype === 'Schema')) {
  globalThis.CW.Schema[s.schema_name] = s
}
globalThis.CW._compileSchemas()

This worked perfectly in browser — window.addEventListener('load') fires, fetch runs async, schemas load, compile, app boots.

The problem was making the same work in Worker (Cloudflare Workers, D1).

Why Worker Boot Was Different

Several fundamental CF Worker constraints collided:

1. ES module imports are hoisted — all import statements execute before any module-level code. So you cannot set a flag between imports to signal "this is Worker not browser". Any attempt like:

javascript
import './CW-state.js'
globalThis._isWorker = true  // ← runs AFTER all imports
import './boot.js'            // ← already ran before this line

2. fetch() prohibited at module scope — CF Workers throw if you call fetch() outside a handler. So boot.js cannot call fetch('/db.json') at import time.

3. window exists in CF Workers — CF Workers alias window to globalThis, so typeof window !== 'undefined' is always true. This broke every environment detection attempt.

4. env only available in fetch handler — globalThis.env?.DB is undefined at module load time because env is only injected per-request. Any bootstrap that needs env.DB to detect Worker environment cannot run at import time.

5. Proxy on CW — CW-state.js wraps CW in a Proxy:

javascript
globalThis.CW = new Proxy(globalThis.CW, {
  get(target, prop) {
    if (prop in target) return target[prop]
    return globalThis[prop] || {}
  }
})

Any property not on the underlying target returns {} — truthy. So if (globalThis.CW._booted) return always exited immediately because CW._booted returned {} via Proxy, never the actual boolean. This silently prevented schemas from loading on every call.

Attempts That Failed
if (typeof window === 'undefined') — CF Workers have window, always false
if (globalThis.CW._booted) return — Proxy returns {}, always truthy, always exits
globalThis._CW_booted as plain global — worked for guard but didn't solve the fetch timing issue
CW._bootstrap = bootstrap in else branch — Proxy returned globalThis['_bootstrap'] || {} which worked sometimes but was unreliable
workerBootstrap as separate function — still had the module-load timing problem with fetch()
Separate schemas.js import — ES module hoisting meant globalThis._schemas was never set before boot.js ran
The Solution — Inline Schemas in CW-config.js

The cleanest solution was to eliminate the async fetch entirely by inlining schema data directly in CW-config.js:

javascript
// extract from db.json — run once in browser console
fetch('/db.json')
  .then(r => r.json())
  .then(docs => {
    const schemas = docs.filter(d => d.doctype === 'Schema')
    const output = schemas.map(s => 
      `globalThis.CW.Schema['${s.schema_name}'] = ${JSON.stringify(s)}`
    ).join('\n')
    console.log(output)
  })

Paste output into CW-config.js:

javascript
// ── schemas ──────────────────────────────────────────────────
globalThis.CW.Schema = {}
globalThis.CW.Schema['Task'] = { ... }
globalThis.CW.Schema['User'] = { ... }
globalThis.CW.Schema['Role'] = { ... }
// ... all 63 schemas

CW._compileSchemas()  // ← compile immediately after
Why This Works for Both
Browser — CW-config.js loads via <script> tag synchronously before boot.js. Schemas are available immediately when boot.js fires on window.load. No async fetch needed.
Worker — import './CW-config.js' at module load runs synchronously. Schemas populated before any request arrives. No fetch(), no env, no timing issues.

CW._compileSchemas() at the bottom of CW-config.js compiles FSM sideEffects/rules strings into live functions and merges systemFields into every schema — same as before, just called synchronously during config load instead of asynchronously during boot.

What boot.js Does Now

With schemas handled by CW-config.js, boot.js is minimal — browser only, no Worker involvement:

javascript
async function bootstrap() {
  const dbAdapter = CW._config.adapters?.defaults?.db
  const adapter   = globalThis.Adapters?.[dbAdapter]
  if (adapter?.init) await adapter.init()
  if (typeof authRestore === 'function') authRestore()
  globalThis.dispatchEvent(new CustomEvent('CW:booted'))
  console.log('✅ CW bootstrap complete')
}

window.addEventListener('load', () => bootstrap())

No schema loading, no compile — already done in config. Boot just inits the adapter and fires the ready event.