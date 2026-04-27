# CW FSM — Finite State Machine

Documents the CW multi-dimensional FSM architecture, signal format, schema merging,
button rendering, and Edit/Save pattern. Status as of April 17, 2026.

---

## Overview

Every CW document has a multi-dimensional state machine. Each dimension tracks an
independent lifecycle. Dimensions run in parallel — transitioning one dimension never
affects another.

Dimensions are declared in schema `_state` as numbered keys:

```json
"_state": {
  "0": { ... },   ← dim 0: universal docstatus lifecycle (from SystemSchema)
  "1": { ... },   ← dim 1: doctype-specific lifecycle (declared in doctype schema)
  "2": { ... }    ← dim 2: further domain-specific (if needed)
}
```

---

## Dim 0 — Universal Docstatus (SystemSchema)

Dim 0 is declared in `SystemSchema` and inherited by every doctype. It tracks the
universal document lifecycle:

| Value | Label | Meaning |
|---|---|---|
| 0 | Draft | Editable, not yet submitted |
| 1 | Submitted | Locked, approved |
| 2 | Cancelled | Voided |

**Transitions:**

| Signal | Label | Requires |
|---|---|---|
| `0.0_1` | Submit | `is_submittable: 1` on schema |
| `0.0_2` | Delete | — |
| `0.1_2` | Cancel | `is_submittable: 1` on schema |
| `0.2_0` | Amend | `is_submittable: 1` on schema |

Dim 0 also sets `docstatus` field directly — `_execTransition` patches `doc.docstatus`
when dim is `"0"`. The dim current value is NOT stored as a bare key — it is derived
from the signal key at read time (see `_getDimValue` below).

---

## Dim 1+ — Doctype-Specific Lifecycle

Dim 1 is declared in the doctype schema only. Each doctype declares its own domain
states, transitions, labels, sideEffects, and rules.

**Example — Task approval lifecycle (dim 1):**

```json
"_state": {
  "1": {
    "name": "_task_status",
    "values": [0, 1, 2, 3],
    "options": ["Draft", "Pending", "Approved", "Rejected"],
    "transitions": {
      "0": [1],
      "1": [2, 3],
      "2": [3],
      "3": [1]
    },
    "labels": {
      "0_1": "Submit for Review",
      "1_2": "Approve",
      "1_3": "Reject",
      "2_3": "Revoke Approval",
      "3_1": "Resubmit"
    },
    "sideEffects": {
      "0_1": "async function(run_doc) { run_doc.input.status = 'Pending'; }",
      "1_2": "async function(run_doc) { run_doc.input.status = 'Approved'; }",
      "1_3": "async function(run_doc) { run_doc.input.status = 'Rejected'; }"
    },
    "rules": {
      "1_2": "(run_doc) => { const doc = run_doc.target?.data?.[0] || {}; return CW._getDimValue(doc, '0', CW._getStateDef(run_doc.target_doctype)['0']) === 0; }"
    },
    "requires": {}
  }
}
```

Dim 1 transitions never touch `docstatus`. They only update signal keys in `_state`.

---

## Schema Merging — _getStateDef

`CW._getStateDef(doctype)` merges SystemSchema + doctype `_state` for all dims.

```javascript
function _getStateDef(doctype) {
  const sys    = CW.Schema?.SystemSchema?._state || {}
  const dt     = CW.Schema?.[doctype]?._state    || {}
  const dims   = new Set([...Object.keys(sys), ...Object.keys(dt)])
  const merged = {}
  for (const dim of dims) {
    const sysDim = sys[dim] || {}
    const dtDim  = dt[dim]  || {}
    merged[dim]  = Object.assign({}, sysDim, dtDim)
    merged[dim].sideEffects = Object.assign({}, sysDim.sideEffects || {}, dtDim.sideEffects || {})
  }
  return merged
}
```

**Merge rules:**

- Doctype schema **overrides** SystemSchema at the dim level via `Object.assign`
- `sideEffects` are deep merged per key — doctype can override individual sideEffect keys
- Dims only in SystemSchema (dim 0) → inherited by all doctypes automatically
- Dims only in doctype schema (dim 1+) → doctype-specific, not shared
- A doctype can override dim 0 behavior by declaring `_state['0']` in its own schema

---

## Signal Format

All FSM signals use the format `"dim.from_to"`:

```
"0.0_1"   ← dim 0, transition from state 0 to state 1 (Submit)
"0.1_2"   ← dim 0, transition from state 1 to state 2 (Cancel)
"1.0_1"   ← dim 1, transition from state 0 to state 1 (Submit for Review)
"1.1_2"   ← dim 1, transition from state 1 to state 2 (Approve)
```

Signals are passed in `run_doc.input._state` with `""` as the trigger value:

```javascript
run_doc.input._state = { '1.0_1': '' }   // '' = fire this signal (in memory only)
```

After execution — in memory on `run_doc.input._state` for the caller:
```javascript
run_doc.input._state = { '1.0_1': '1' }  // '1' = success
run_doc.input._state = { '1.0_1': '-1' } // '-1' = failed
```

**`""` is never written to PocketBase.** Only `"1"` (success) reaches PB.
`"-1"` stays in memory — failed transitions leave no trace in the stored document.

---

## _state on the Document — New Format

The document `_state` field stores **only signal keys** — one per transition fired.
No bare dim keys (`"0"`, `"1"`) are stored. Current state is derived from signal keys
at read time by `_getDimValue`.

```json
{
  "_state": {
    "0.0_1": "1",   ← dim 0 submitted (current dim 0 = 1)
    "1.0_1": "1",   ← dim 1 submitted for review
    "1.1_2": "1"    ← dim 1 approved (current dim 1 = 2)
  }
}
```

**Key rules:**

- One key per transition — overwritten on each attempt
- Value `"1"` = last attempt succeeded, current state = `to`
- Value never `""` or `"-1"` in PB — only `"1"` stored
- New document onCreate → `_state: {}` — empty, no keys
- Current state always derivable from the last successful signal key per dim

**Example with cycle (Submit → Cancel → Amend → Submit again):**

```json
{
  "_state": {
    "0.0_1": "1",   ← submitted (overwrites previous 0.0_1 if any)
    "0.1_2": "1",   ← cancelled
    "0.2_0": "1"    ← amended, current dim 0 = 0 (to=0)
  }
}
```

Each new transition for `0→1` overwrites `"0.0_1"` — no history, only last result.

---

## _getDimValue — Reading Current State

Derives current dim value from signal keys. No bare dim keys needed.

```javascript
function _getDimValue(doc, dim, dimDef) {
  var state = doc._state
  if (typeof state === 'string') { try { state = JSON.parse(state) } catch(_) { state = {} } }
  if (state && typeof state === 'object') {
    const prefix = dim + '.'
    var current = null
    for (const [k, v] of Object.entries(state)) {
      if (!k.startsWith(prefix)) continue
      const rest = k.slice(prefix.length)
      const parts = rest.split('_')
      if (parts.length !== 2) continue
      const from = parseInt(parts[0])
      const to   = parseInt(parts[1])
      if (isNaN(from) || isNaN(to)) continue
      if (v === '1')  current = to
      if (v === '-1') current = from
    }
    if (current !== null) return current
    if (dim in state) return state[dim]
  }
  if (dimDef?.fieldname && dimDef.fieldname in doc) return doc[dimDef.fieldname]
  return dimDef?.values?.[0] ?? 0
}
```

---

## Signal Routing — _handleSignal

`_handleSignal` uses strict prefix matching — each dim only processes signals
prefixed with `"dim."`:

```javascript
for (const [dim, dimDef] of Object.entries(stateDef)) {
  if (!signal.startsWith(dim + '.')) continue
  const key = signal.slice(dim.length + 1)   // "0.0_1" → "0_1"
  // validate + execute
}
```

**Execution pattern — mini-transaction:**

```javascript
try {
  await CW._execTransition(run_doc, dim, key)   // run sideEffects
  run_doc.input._state[signal] = '1'            // mark success
  await CW._handlers.update(run_doc)            // write "1" to PB
} catch(e) {
  run_doc.input._state[signal] = '-1'           // mark failure (memory only)
  run_doc.error = e.message                     // no write to PB
}
```

---

## requires — Schema-Level Gate

`requires` is a static gate — evaluated against the **schema** before allowing a
transition. It checks schema-level flags, not runtime document state.

```json
"requires": {
  "0_1": { "is_submittable": 1 }
}
```

`Number(schema[k] ?? 0) === Number(v)` — if the schema does not satisfy the condition,
the transition is blocked in both UI (`_getTransitions` filters it out) and execution
(`_handleSignal` rejects it). No document access needed.

**Use `requires` for:** structural constraints on the doctype itself — submittability,
feature flags, schema capabilities.

---

## rules — Runtime Gate

`rules` is a runtime gate — a function compiled at boot from a string, called with
`run_doc` before sideEffects run. Must return boolean.

```json
"rules": {
  "1_2": "(run_doc) => { const doc = run_doc.target?.data?.[0] || {}; return CW._getDimValue(doc, '0', CW._getStateDef(run_doc.target_doctype)['0']) === 0; }"
}
```

Rules have full access to the document, other dims, current user, and config. They run
**before sideEffects** — if a rule returns false, the transition is rejected immediately,
sideEffects never execute, `"-1"` is set in memory, nothing written to PB.

**Execution order:**

```
1. requires check   ← static schema gate
2. rules check      ← runtime gate — can read any dim value, any field
3. sideEffects      ← consequences — only run if requires + rules pass
4. mark "1", write  ← commit
```

**Use `rules` for:** cross-dim conditions, field value checks, user-context conditions,
any logic that depends on the current document state at the moment of firing.

**Cross-dim rule pattern** — block a dim 1 transition based on dim 0 state:

```json
"rules": {
  "1_2": "(run_doc) => { const doc = run_doc.target?.data?.[0] || {}; return CW._getDimValue(doc, '0', CW._getStateDef(run_doc.target_doctype)['0']) === 0; }"
}
```

This rule reads dim 0 current state via `_getDimValue` and blocks `1→2` unless dim 0
is in state 0. Both UI (button hidden) and execution (signal rejected) respect the rule.

**Important:** `run_doc` passed to rules in `_getTransitions` (UI) includes
`target_doctype` — required for `_getStateDef` calls inside rules:

```javascript
rule({ target: { data: [doc] }, input: {}, target_doctype: schema.schema_name || schema.name })
```

---

## sideEffects — Consequences

SideEffects declare what happens when a transition fires. They run **after** requires
and rules pass — they are consequences, not gates.

Declared as function strings, compiled at boot by `_compileSchemas()`.
Keys use bare format (`"0_1"`) — dim prefix is stripped before lookup.

**Two patterns:**

**1. Own-document field mutation** — mutate `run_doc.input` directly:

```json
"sideEffects": {
  "0_1": "async function(run_doc) { run_doc.input.status = 'Pending'; }"
}
```

`run_doc.input` is written to PB in the same PATCH as `_state`. One write, atomic.
This is the correct pattern for setting fields on the same document.

**2. Cross-document update** — call `run_doc.child()`:

```json
"sideEffects": {
  "0_1": "async function(run_doc) { const rec = run_doc.target?.data?.[0]; await run_doc.child({ operation: 'update', target_doctype: 'ParentDoc', query: { where: { name: rec.parent } }, input: { _allowed: [...] }, options: { render: false, internal: true } }); }"
}
```

Use `run_doc.child()` only for updating **other documents**. Never use naked `CW.run()`.

**3. Adapter call** — dotted key notation:

```json
"sideEffects": {
  "0_1": "async function(run_doc) { run_doc.input.enabled = 1; }",
  "0_1.Adapter.auth.activate":      "",
  "0_1.Adapter.auth.generateToken": "",
  "0_1.Adapter.email.send":         ""
}
```

Adapter path keys are resolved at runtime via `globalThis['Adapter']['auth']['activate']`.
They are NOT compiled at boot (`_compileSchemas` skips keys containing `.`).

**Execution order within a transition:**

1. Bare key (`"0_1"`) — inline function — runs first
2. Dotted keys (`"0_1.Adapter.x.y"`) — adapter calls — run in schema key order

All effects are sequential with `await`. If any effect throws, the entire transition
fails — `"-1"` in memory, nothing written to PB.

**sideEffects are the only place business logic runs on a transition.** The dim value
recording (`"dim.from_to": "1"` in `_state`) is the framework's built-in implicit
sideEffect — always runs, never declared in schema.

---

## _state Preservation on Update

`_preflight` update preserves ALL existing `_state` keys. Incoming `input._state`
(new signal) takes precedence via `Object.assign`:

```javascript
if (run_doc.target?.data?.[0]?._state) {
  const targetState = run_doc.target.data[0]._state
  input._state = Object.assign({}, targetState, input._state || {})
}
```

---

## permissions — onCreate and UI Transitions

`schema.permissions` serves two purposes:

**1. onCreate — populate `_allowed`/`_allowed_read`**

```json
"permissions": [
  { "role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "transitions": {...} },
  { "role": "Projects Manager", "read": 1, "transitions": {...} }
]
```

`Self` is skipped — owner access handled by `_preflight` stamping `owner = currentUser.id`.

**2. UI transitions — label overrides**

`_getTransitions` applies label overrides from `permissions[role].transitions` based on
current user context. `Self` check: `doc.name === currentUser.id || doc.owner === currentUser.id`.

Labels are display-only — not stored on the document.

---

## _getTransitions — Button Construction

`CW._getTransitions(schema, doc, dim)` returns available transitions filtered by
`requires`, `rules`, and label overrides from `permissions`.

```javascript
{
  signal:  '1.0_1',
  from:    0,
  to:      1,
  label:   'Submit for Review',
  confirm: null
}
```

---

## _getFormButtons — Three Button Groups

`CW._getFormButtons(run_doc)` returns `{ outside, menu }`:

```
outside:
  Save                    ← explicit_edit_intent=1, editing
  primary dim 0 buttons   ← declared in dimDef.primary

menu (•••):
  Edit                    ← explicit_edit_intent=1, not editing, owner
  non-primary dim 0       ← Delete, Cancel, Amend...
  dim 1+                  ← Submit for Review, Approve, Lock Account...
```

---

## Edit / Save — explicit_edit_intent

Edit/Save is **not** a FSM dimension. It is an operation mode switch on `run_doc`.

| Value | Behavior |
|---|---|
| `0` (default) | Auto-switches to `update` when docstatus=0 record opened. No Edit/Save buttons. |
| `1` | Read-only by default. Edit in `•••`. Save outside (primary). |

---

## Schema Compilation — Load Order

```
index.js:
  1. CW-state.js       → CW object, _compileSchemas defined
  2. CW-config.js      → CW._config populated
  3. CW-utils.js       → FSM pure helpers assigned to CW
  4. CW-run.js         → pipeline, handlers
  5. fetch db.json     → CW.Schema populated (strings)
  6. _compileSchemas() → bare sideEffect/rules strings → live functions
                         (keys with "." skipped — Adapter paths resolved at runtime)
  7. Adapter.init()
  8. authRestore()
  9. CW.run select Adapter (view:form) → _compileDocument → all adapters registered
```

---

## Verified Behavior (live tests April 17, 2026)

| Test | Result |
|---|---|
| New document `_state` is `{}` — no bare dim keys | ✅ |
| `"0.0_1": "1"` stored after Submit | ✅ |
| `"1.0_1": "1"` stored after Submit for Review | ✅ |
| No bare `"0"` or `"1"` keys in stored `_state` | ✅ |
| `_getDimValue` derives current=1 from `"0.0_1":"1"` | ✅ |
| `_getDimValue` derives current=0 from `"0.2_0":"1"` (cycle) | ✅ |
| Failed transition → `"-1"` in memory, nothing written to PB | ✅ |
| Retry after failure succeeds, `"1"` overwrites in PB | ✅ |
| Multi-dim signal keys preserved across transitions | ✅ |
| `docstatus` still synced for dim 0 transitions | ✅ |
| `status` field set by sideEffect on dim 1 transitions | ✅ |
| Wrong state rejection — error set, signal `"-1"` in memory | ✅ |
| dim isolation — dim 0 signal does not affect dim 1 keys | ✅ |
| Cross-dim rule — Approve blocked when dim0=1 (Submitted) | ✅ |
| Cross-dim rule — button hidden in UI when rule fails | ✅ |
| Cross-dim rule — signal rejected in _handleSignal when rule fails | ✅ |
| Permissions `_allowed` populated from schema on create | ✅ |
| `_getTransitions` applies label overrides from permissions | ✅ |
| `_getFormButtons` returns correct outside/menu groups | ✅ |
| `FormActions` renders all three button groups in UI | ✅ |
| Adapter effects fire in order after inline sideEffect | ✅ |
| Missing Adapter — warns, other effects still fire | ✅ |
| Adapter throw — transition fails, `"-1"` in memory | ✅ |
