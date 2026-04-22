# CW Adapters

Documents the Adapter doctype, compilation, registration, and wiring into FSM sideEffects.
Status as of April 17, 2026.

---

## Overview

Adapters are first-class CW documents — stored in PocketBase `item` collection with
`doctype: "Adapter"`. Each Adapter record contains callable functions as JSON strings,
an optional SDK script to load, and a config object. At boot, `_compileDocument` evals
the function strings into live functions and registers them on `globalThis.Adapter`.

---

## Adapter Schema

Key fields on the Adapter doctype:

| Field | Type | Purpose |
|---|---|---|
| `adapter_name` | Data, reqd, unique | Semantic alias — used as registration key |
| `functions` | Code (JSON) | Named function strings compiled at boot |
| `scripts` | Code (JSON) | SDK scripts to load (e.g. PocketBase UMD) |
| `config` | Code (JSON) | Static runtime configuration |
| `disabled` | Check | Skip compilation if 1 |

`autoname: "field:adapter_name"` — the record `name` is generated from `adapter_name`.

---

## Registration

After `_compileDocument`, each Adapter is registered at two keys on `globalThis.Adapter`:

```javascript
globalThis.Adapter[doc.name]          // e.g. globalThis.Adapter['adapterjgyb80p0']
globalThis.Adapter[doc.adapter_name]  // e.g. globalThis.Adapter['auth']
```

The `adapter_name` key is the one used in signal paths and code. The `name` key is
the PB record ID — also accessible but not used directly.

**After bootstrap, available adapters:**

```javascript
Object.keys(globalThis.Adapter)
// ['pocketbase', 'memory', 'auth', 'http-gateway', 'sqlite-local', ...]
```

---

## Bootstrap — Loading and Compiling Adapters

Adapters must be fetched with `view: 'form'` to get all fields including `functions`,
`config`, and `adapter_name`. Without `view: 'form'`, only `in_list_view` fields are
returned and `adapter_name` is `undefined`, causing semantic registration to fail.

Add to `index.js` after `authRestore`:

```javascript
// Load and compile all Adapter records
const adapterRun = await CW.run({
  operation:      'select',
  target_doctype: 'Adapter',
  view:           'form',
  options:        { render: false },
})
await CW._compileDocument(adapterRun)
```

`_compileDocument` in `CW-state.js`:
1. Loads SDK scripts via `eval` (skipped if namespace already exists on `globalThis`)
2. Parses `config` JSON → `runtime.config`
3. Evals each function string in `functions` → live function on `runtime`
4. Registers `globalThis.Adapter[doc.name]` and `globalThis.Adapter[adapter_name]`

---

## _compileDocument

```javascript
CW._compileDocument: async function(run_doc) {
  for (const doc of run_doc.target.data) {
    // 1. load SDK scripts
    for (const script of doc.scripts || []) {
      if (globalThis[script.namespace]) continue  // skip if already loaded
      const src = script.source || await fetch(script.src).then(r => r.text())
      (0, eval)(src)
    }

    // 2. compile functions
    const runtime = { config: doc.config }
    for (const [name, fnStr] of Object.entries(doc.functions || {})) {
      runtime[name] = eval('(' + fnStr + ')')
    }

    // 3. register
    globalThis[doc.doctype][doc.name] = runtime
    if (doc.adapter_name && doc.adapter_name !== doc.name) {
      globalThis[doc.doctype][doc.adapter_name] = runtime
    }
  }
}
```

---

## Calling Adapters from FSM sideEffects

Adapter functions are called from FSM `sideEffects` using dotted key notation in the
schema. The key format is:

```
"bare_transition_key.Adapter.adapter_name.function_name"
```

Example — User dim 1 activation fires three effects:

```json
"sideEffects": {
  "0_1": "async function(run_doc) { run_doc.input.enabled = 1; }",
  "0_1.Adapter.auth.activate":       "",
  "0_1.Adapter.auth.generateToken":  "",
  "0_1.Adapter.email.send":          ""
}
```

**Parse rule in `_execTransition`:**

- Key equals bare transition key (`"0_1"`) → inline compiled function → call it
- Key starts with `"0_1."` → strip prefix → resolve path on `globalThis`

```javascript
const path = effectKey.slice(key.length + 1).split('.')
// "Adapter.auth.activate" → ["Adapter", "auth", "activate"]
let target = globalThis
for (const p of path) target = target?.[p]
// target = globalThis.Adapter.auth.activate (live function)
await target(run_doc)
```

**Execution order:** inline function first, then adapter effects in schema key order.

---

## Schema Compilation — Skipping Adapter Path Keys

`_compileSchemas` in `CW-state.js` skips adapter path keys (keys containing `.`) —
they are resolved at runtime, not compiled at boot:

```javascript
for (const [key, fnStr] of Object.entries(def.sideEffects || {})) {
  if (key.includes('.')) continue   // adapter path — skip eval
  if (typeof fnStr === 'string') {
    def.sideEffects[key] = eval('(' + fnStr + ')')
  }
}
```

---

## Error Handling

**Missing adapter** — `_execTransition` logs a warning and continues:

```javascript
if (typeof target === 'function') await target(run_doc)
else console.warn('[CW] Adapter effect not found:', path.join('.'))
```

Other effects in the transition still fire. The transition succeeds if no throw occurs.

**Adapter throws** — propagates up to `_handleSignal` try/catch:

```javascript
try {
  await CW._execTransition(run_doc, dim, key)
  run_doc.input._state[signal] = '1'
  await CW._handlers.update(run_doc)
} catch(e) {
  run_doc.input._state[signal] = '-1'  // memory only, not written to PB
  run_doc.error = e.message
}
```

The entire transition fails — `"-1"` in memory, document unchanged in PB.

---

## Available Adapters (live — April 17, 2026)

| adapter_name | Purpose |
|---|---|
| `pocketbase` | Primary DB adapter — select/create/update/delete on `item` collection |
| `memory` | In-memory adapter for testing |
| `auth` | User authentication — activate, generateToken |
| `http-gateway` | HTTP request adapter |
| `sqlite-local` | Local SQLite adapter |

---

## Accessing Adapters

Via `globalThis` directly:
```javascript
globalThis.Adapter.auth.activate(run_doc)
globalThis.Adapter.pocketbase.select(run_doc)
```

Via CW Proxy (`CW-state.js` Proxy forwards unknown props to `globalThis`):
```javascript
CW.Adapter.auth.activate(run_doc)
```

---

## Load Order

```
index.js:
  1. CW-state.js          → _compileDocument defined
  2. CW-config.js         → CW._config populated
  3. CW-utils.js          → FSM helpers
  4. CW-run.js            → pipeline
  5. pb-adapter-pocketbase.js → globalThis.Adapter.pocketbase registered
  6. auth.js              → auth helpers
  7. db.json fetch        → CW.Schema populated
  8. _compileSchemas()    → sideEffect strings → live functions (skips "." keys)
  9. Adapter.pocketbase.init()
  10. authRestore()
  11. CW.run select Adapter (view:form) → _compileDocument → all adapters registered
```

