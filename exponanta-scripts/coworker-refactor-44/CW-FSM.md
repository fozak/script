# CW FSM — Finite State Machine

Documents the CW multi-dimensional FSM architecture, signal format, schema merging,
button rendering, and Edit/Save pattern. Status as of April 16, 2026.

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

Dim 0 also sets `docstatus` field directly — `_execTransition` patches both
`_state['0']` and `doc.docstatus` when dim is `"0"`.

---

## Dim 1+ — Doctype-Specific Lifecycle

Dim 1 is declared in the doctype schema only. Each doctype declares its own domain
states, transitions, labels, sideEffects, and rules.

**Example — User auth lifecycle (dim 1):**

```json
"_state": {
  "1": {
    "name": "_auth_status",
    "values": [0, 1, 2, 3, 4],
    "options": ["Invited", "Active", "Locked", "Password Reset Pending", "Disabled"],
    "transitions": {
      "0": [1, 4],
      "1": [2, 3, 4],
      "2": [1, 4],
      "3": [1, 4],
      "4": [0]
    },
    "labels": {
      "0_1": "Activate",
      "0_4": "Cancel Invitation",
      "1_2": "Lock Account",
      "1_3": "Require Password Reset",
      "1_4": "Disable User",
      "2_1": "Unlock Account",
      "3_1": "Complete Reset",
      "4_0": "Re-invite"
    },
    "sideEffects": { ... },
    "rules": {},
    "requires": {}
  }
}
```

Dim 1 transitions never touch `docstatus`. They only update `_state['1']`.

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
    // sideEffects deep merged — doctype overrides SystemSchema per key
    merged[dim].sideEffects = Object.assign({}, sysDim.sideEffects || {}, dtDim.sideEffects || {})
  }
  return merged
}
```

**Merge rules:**

- Doctype schema **overrides** SystemSchema at the dim level via `Object.assign`
- `sideEffects` are deep merged per key — doctype can override individual sideEffect keys
  without replacing the entire sideEffects object
- Dims only in SystemSchema (dim 0) → inherited by all doctypes automatically
- Dims only in doctype schema (dim 1+) → doctype-specific, not shared
- A doctype can override dim 0 behavior by declaring `_state['0']` in its own schema

**Example — what User gets:**

```
SystemSchema._state['0']  → merged as User dim 0 (Submit/Cancel/Amend)
User._state['1']          → User dim 1 (Invited/Active/Locked/...)
Result: { '0': {...}, '1': {...} }
```

---

## Signal Format

All FSM signals use the format `"dim.from_to"`:

```
"0.0_1"   ← dim 0, transition from state 0 to state 1 (Submit)
"0.1_2"   ← dim 0, transition from state 1 to state 2 (Cancel)
"1.0_1"   ← dim 1, transition from state 0 to state 1 (Activate)
"1.1_2"   ← dim 1, transition from state 1 to state 2 (Lock Account)
```

Signals are passed in `run_doc.input._state`:

```javascript
run_doc.input._state = { '1.0_1': '' }   // '' = pending signal
```

After execution:
```javascript
run_doc.input._state = { '1.0_1': '1' }  // '1' = success
// or
run_doc.input._state = { '1.0_1': '-1' } // '-1' = rejected
```

---

## Signal Routing — _handleSignal

`_handleSignal` uses strict prefix matching — each dim only processes signals
prefixed with `"dim."`:

```javascript
for (const [dim, dimDef] of Object.entries(stateDef)) {
  if (!signal.startsWith(dim + '.')) continue   // strict — skip other dims
  const key = signal.slice(dim.length + 1)      // "0.0_1" → "0_1"
  // validate + execute
}
```

This ensures:
- `"0.0_1"` only fires dim 0 — never dim 1
- `"1.0_1"` only fires dim 1 — never dim 0
- A dim 1 sideEffect cannot accidentally trigger from a dim 0 signal

---

## _state on the Document

The document `_state` field stores current dim values plus signal history:

```json
{
  "_state": {
    "0": 0,        ← dim 0 current value (docstatus)
    "1": 1,        ← dim 1 current value (Active)
    "0.0_1": "1",  ← last dim 0 signal result
    "1.0_1": "1"   ← last dim 1 signal result
  }
}
```

`_preflight` on update preserves existing dim values when merging:

```javascript
// extract numeric dim keys from existing _state
const dimKeys = Object.keys(targetState).filter(k => !isNaN(k))
const baseDimState = {}
dimKeys.forEach(k => { baseDimState[k] = targetState[k] })
// merge — incoming signal added, existing dims preserved
input._state = Object.assign({}, baseDimState, input._state || {})
```

If a document has no `_state` yet (old record), `_preflight` initializes all dims
from `stateDef` using `_getDimValue` fallback to `docstatus` or `values[0]`.

---

## _getDimValue — Reading Current State

```javascript
function _getDimValue(doc, dim, dimDef) {
  let state = doc._state
  if (typeof state === 'string') {
    try { state = JSON.parse(state) } catch(_) { state = {} }
  }
  if (state && typeof state === 'object' && dim in state) return state[dim]
  if (dimDef?.fieldname && dimDef.fieldname in doc) return doc[dimDef.fieldname]
  return dimDef?.values?.[0] ?? 0
}
```

Three fallbacks in order:
1. `doc._state[dim]` — e.g. `_state['0'] = 1`
2. `doc[dimDef.fieldname]` — e.g. `doc.docstatus = 1` (dim 0 fallback)
3. `dimDef.values[0]` — first value in dim definition (default `0`)

Handles legacy records with string `_state`, missing `_state`, or old flat-key format
gracefully without crashing.

---

## sideEffects

SideEffects fire after a transition is validated and before the document is written.
They are declared as function strings in schema and compiled to live functions at boot
by `CW._compileSchemas()`.

```json
"sideEffects": {
  "0_1": "async function(run_doc) { ... }"
}
```

Keys use bare format (`"0_1"`) — the dim prefix is stripped by `_handleSignal` before
looking up the sideEffect.

SideEffects receive `run_doc` and can call `run_doc.child()` for further operations.
They must never use naked `CW.run()`.

---

## requires and rules

**`requires`** — schema-level gate. Checks schema fields before allowing a transition.

```json
"requires": {
  "0_1": { "is_submittable": 1 }
}
```

If the doctype schema does not have `is_submittable: 1`, the Submit transition
is blocked — button hidden in UI, signal rejected in `_handleSignal`.

**`rules`** — runtime gate. A function called with `run_doc` that returns boolean.

```json
"rules": {
  "0_1": "(run_doc) => Object.keys(run_doc.input).filter(k => k !== '_state').length === 0"
}
```

Rules are compiled from strings at boot by `_compileSchemas`. Both `requires` and
`rules` must pass for a transition to proceed.

---

## _getTransitions — Button Construction

`CW._getTransitions(schema, doc, dim)` returns available transitions for a dim
given the current document state. Filters by `requires` and `rules`.

Returns array of:
```javascript
{
  signal: '0.0_1',   // full prefixed signal — used in _state input
  from:   0,         // current state value
  to:     1,         // target state value
  label:  'Submit',  // from dimDef.labels['0_1']
  confirm: null      // from dimDef.confirm['0_1'] if set
}
```

`signal` is used directly in `_state` — no transformation needed in UI components.

---

## MainForm Button Rendering

`MainForm` collects buttons from dim 0 via `CW._getTransitions`:

```javascript
const buttons = CW._getTransitions(schema, doc, '0')
```

**Primary buttons** — declared in `dimDef.primary` — rendered outside `•••` always visible:
```json
"primary": { "0_1": true }
```

**Menu buttons** — all non-primary dim 0 transitions — rendered inside `•••` dropdown.

**Dim 1+ buttons** — currently all go inside `•••` menu. Never primary.
*(MainForm multi-dim button collection is pending implementation — currently only dim 0
is collected. Dim 1 buttons will be added to `•••` when multi-dim UI is implemented.)*

---

## Edit / Save — explicit_edit_intent

Edit/Save is **not** a FSM dimension. It is an operation mode switch on `run_doc` — ephemeral,
per-session, not stored on the document.

```
run_doc.operation = 'select'   → view mode (read-only fields)
run_doc.operation = 'update'   → edit mode (fields editable)
```

Controlled by `explicit_edit_intent` flag on schema:

| Value | Behavior |
|---|---|
| `0` (default) | `MainForm` auto-switches to `update` when docstatus=0 record opened. Fields immediately editable. No Edit/Save buttons shown. |
| `1` | Fields read-only by default. Edit button in `•••` switches to `update`. Save button (primary) switches back to `select`. |

```json
"explicit_edit_intent": 1
```

Use `1` for doctypes with rich composer fields (BlockNote) where accidental edits are undesirable.
Leave unset (defaults `0`) for inline forms (Task, Role, User).

**Edit/Save buttons in `•••` menu:**

```
•••  dropdown contains:
  ├── non-primary dim 0 FSM transitions  (Cancel, Delete, Amend...)
  ├── dim 1+ FSM transitions             (Lock Account, Disable User...)
  └── Edit                               (only when explicit_edit_intent=1, not editing, owner)

Outside •••:
  ├── primary dim 0 buttons              (Submit, Publish...)
  └── Save                               (only when explicit_edit_intent=1, editing)
```

**Edit/Save never appears alongside FSM transitions in the primary slot** — Save is primary
only because the user explicitly entered edit mode. The FSM primary button is suppressed
while editing.

---

## Schema Compilation

String sideEffects and rules are compiled to live functions at boot:

```javascript
// in index.js after db.json loaded:
CW._compileSchemas()
```

`CW._compileSchemas()` is defined in `CW-state.js`. It iterates all schemas and evals
string sideEffects and rules into live functions. After this call, no further string
parsing occurs anywhere in the framework.

**Load order:**

```
index.js:
  1. import CW-state.js      → CW object, _compileSchemas defined
  2. import CW-config.js     → CW._config populated
  3. import CW-utils.js      → FSM pure helpers assigned to CW
  4. import CW-run.js        → pipeline, handlers
  5. fetch db.json           → CW.Schema populated (strings)
  6. CW._compileSchemas()    → strings → live functions
  7. Adapter.pocketbase.init()
  8. authRestore()
```

---

## Verified Behavior (live tests April 16, 2026)

| Test | Result |
|---|---|
| `_getStateDef('User')` returns dims `['0', '1']` | ✅ |
| dim 0 labels from SystemSchema correct | ✅ |
| dim 1 labels from User schema correct | ✅ |
| `_getTransitions` dim 0 — no Submit for `is_submittable:0` User | ✅ |
| `_getTransitions` dim 1 — Activate + Cancel Invitation for Invited user | ✅ |
| dim 0 signal `0.0_1` Submit — updates docstatus, no dim 1 effect | ✅ |
| dim 1 signal `1.0_1` Activate — updates `_state.1`, no dim 0 effect | ✅ |
| Wrong state rejection — `1.0_1` from Active state → error + signal `-1` | ✅ |
| Dim isolation — dim 0 sideEffect not fired by dim 1 signal | ✅ |
| Multi-dim `_state` preservation across sequential transitions | ✅ |
| Defensive `_getDimValue` — handles string `_state`, undefined, old flat-key format | ✅ |
