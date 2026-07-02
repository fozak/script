# CW Adapter Pattern

## What is an Adapter

An Adapter is a named async function registered on `globalThis.Adapter` that:
- Receives `run_doc` as its only argument
- Operates on `run_doc.target.data[0]` (the current document)
- Uses `run_doc.child()` for any nested CW operations
- Calls `CW._logThreads()` as its last step if it produces a communication event

---

## Two Sources of Adapters

### Source 1 — JS files (hardcoded infrastructure)

Registered at bootstrap from JS files loaded via `import`. Used for core infrastructure adapters that must always be available and are not user-editable.

```js
// pb-adapter-pocketbase.js
globalThis.Adapter.pocketbase = {
  select: async function(run_doc) { ... },
  create: async function(run_doc) { ... },
  update: async function(run_doc) { ... },
}
```

The `pocketbase` adapter is the only JS-file adapter. It is kept at `docstatus: 0` in PocketBase so the bootstrap compile never overwrites it.

### Source 2 — Adapter doctype in PocketBase

User-defined or system adapters stored as `doctype: "Adapter"` records. Functions are stored as JSON strings in the `functions` field and compiled at bootstrap.

```js
// Adapter record in PocketBase
{
  doctype: "Adapter",
  adapter_name: "note",
  docstatus: 1,            // must be 1 to compile at bootstrap
  functions: JSON.stringify({
    add: `async function(run_doc) {
      await CW._logThreads(run_doc, {
        adapter: 'note.add',
        subject: run_doc.target.data[0]._note,
        data: { body: run_doc.target.data[0]._note }
      })
    }`
  })
}
```

---

## Compile Flow

### At bootstrap (`index.js`)

```js
// 1. Init pocketbase adapter from JS file
await globalThis.Adapter.pocketbase.init()

// 2. Restore auth session
if (typeof authRestore === 'function') authRestore()

// 3. Fetch and compile submitted Adapter records from PocketBase
const adapterRun = await CW.run({
  operation: 'select',
  target_doctype: 'Adapter',
  view: 'form',                    // fetch all fields including functions
  options: { render: false }
})
if (adapterRun.success) {
  adapterRun.target.data = adapterRun.target.data.filter(a => a.docstatus === 1)
  await CW._compileDocument(adapterRun)
}
```

### `_compileDocument` registration

For each Adapter record, `_compileDocument` registers two keys on `globalThis.Adapter`:

```js
globalThis.Adapter['adapternotwre5r'] = runtime  // by doc.name (PB id)
globalThis.Adapter['note']            = runtime  // by adapter_name (semantic key)
```

The semantic key comes from `autoname: "field:adapter_name"` on the Adapter schema.

### `_compileSchemas` guard

SideEffect values that are dotted path references (e.g. `"Adapter.note.add"`) are left as strings — not eval'd. The guard in `_compileSchemas`:

```js
if (key.includes('.') || !fnStr.includes('function')) continue;
```

At runtime, `_execTransition` resolves the dotted path:
```js
const path = fn.split('.')           // ['Adapter', 'note', 'add']
let resolved = globalThis
for (const p of path) resolved = resolved?.[p]
if (typeof resolved === 'function') await resolved(run_doc)
```

---

## Two Ways to Call an Adapter

### Way 1 — Direct call

Select the document, set any required fields, call the Adapter directly.

```js
const r = await CW.run({
  operation: 'select',
  target_doctype: 'Customer',
  query: { where: { name: 'customerabc123' } }
})
r.target.data[0]._note = 'Called customer, confirmed order'
await Adapter.note.add(r)
```

**Traceability:** `_threads` entry written by the Adapter. Not in `_changes`.

**When to use:** Standalone actions not tied to a document state transition — adding a note manually, sending an email from a script, logging an inbound call.

---

### Way 2 — FSM sideEffect

The Adapter dotted path is registered as a sideEffect value on a Schema FSM dim transition. Fires automatically when the signal is triggered.

**Schema FSM definition** (stored in PocketBase Schema doc `_state` field):
```json
{
  "1": {
    "transitions": { "0": [1], "1": [0] },
    "sideEffects": {
      "0_1": "Adapter.note.add"
    },
    "labels": {
      "0_1": "Add Note"
    }
  }
}
```

**Call:**
```js
await CW.run({
  operation: 'update',
  target_doctype: 'Customer',
  query: { where: { name: 'customerabc123' } },
  input: {
    _state: { '1.0_1': '' },
    _note: 'Status changed to active'
  }
})
```

**Traceability:** `_changes` entry with `sig: ['1.0_1']` + `_threads` entry written by the Adapter.

**When to use:** Actions that are a consequence of a document state transition — log note when lead is qualified, send email when order is submitted, notify when task is completed.

---

## When to Use Which

| Situation | Pattern |
|---|---|
| Standalone user action, no state change | Direct call |
| Consequence of FSM transition | FSM sideEffect |
| Script or AgentJob over a set of records | Direct call inside script |
| Always fires on a specific doctype transition | FSM sideEffect in Schema |

---

## Writing to `_threads`

Every Adapter that produces a communication event must call `CW._logThreads()` as its last step. The framework does not call it automatically — it is the Adapter's responsibility.

```js
await CW._logThreads(run_doc, {
  adapter: 'note.add',      // required — dotted adapter key, self-identifying
  subject: '...',            // optional — human readable summary
  ref: 'some-doc-name',     // optional — link to related record
  data: { ... }             // optional — nested payload, any shape
})
```

### How `_logThreads` works

1. Reads current `_threads` array from `run_doc.target.data[0]`
2. Appends new entry with `at`, `by`, `adapter` and any optional fields
3. Calls `_patchDataField(doc.name, '_threads', next)` — fetches current full `data` from PocketBase, merges `_threads` field only, writes back
4. Updates `doc._threads` in memory

This prevents `_threads` from overwriting `_changes` or other data fields — only `_threads` is patched in PocketBase.

### `_threads` entry shape

```json
{
  "at": 1778189286017,
  "by": "user0295tdhlz4y",
  "adapter": "note.add",
  "subject": "Note via FSM sideEffect",
  "data": {
    "body": "Note via FSM sideEffect"
  }
}
```

### Infrastructure Adapters

Adapters that don't produce communication events (`pocketbase.*`, `cache.invalidate`, `webhook.ping`) do not call `_logThreads`.

---

## Adapter docstatus Convention

| docstatus | Meaning |
|---|---|
| 0 | Draft — not compiled at bootstrap |
| 1 | Active — compiled at bootstrap |

The `pocketbase` adapter is always kept at `docstatus: 0` so the JS file version is never overwritten by the DB compile.
