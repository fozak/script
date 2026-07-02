# CW Input Channels & Change Logging

## Overview

Every write in CW goes through `run_doc.input{}` — a universal intake buffer.
But different types of input have different processing pipelines and different
logging strategies. There are five distinct input channels, each with its own
behavior.

---

## The Five Input Channels

### 1. Data Channel — normal schema fields

**Key pattern:** `fieldname`
**Example:** `{ subject: 'Fix login bug', priority: 'High' }`

**Pipeline:**
```
input.subject → _mergeInput → doc.subject = 'Fix login bug'
```

**Logged by:** `_logChanges` auto-diff before `_mergeInput`
- `doc[k]` = old value
- `input[k]` = new value
- Both known at the same moment → simple subtraction

**Test result:** ✅
```json
{ "field": "subject", "from": "Old Subject", "to": "New Subject" }
```

---

### 2. Signal Channel — FSM transitions

**Key pattern:** `_state: { 'dim.from_to': '' }`
**Example:** `{ _state: { '1.0_1': '' } }`

**Pipeline:**
```
input._state → _mergeInput → doc._state merged
→ controller detects signal with value ''
→ _handleSignal → _resolveSignalTransition → _execTransition → sideEffects
```

**Logged by:** `_logChanges` auto-diff — special handling for `_state`:
```javascript
const signals = Object.entries(run_doc.input._state || {})
  .filter(([, v]) => v === '')
  .map(([k]) => k)
```

Signal keys with value `''` (pending) are extracted into `sig[]` array.
Stored separately from field diffs — signals are intent, not field mutations.

**Test result:** ✅
```json
{ "op": "update", "sig": ["1.0_1"] }
```

Note: sideEffect mutations (fields changed inside `_execTransition`) appear
as separate `ch` entries if they modify data fields.

---

### 3. ACL Channel — access control arrays

**Key pattern:** `_allowed`, `_allowed_read`
**Example:** `{ _allowed_read: ['roleprojecmanag', 'user062c67oyuz0'] }`

**Pipeline:**
```
input._allowed_read → _mergeInput → doc._allowed_read = [...]
→ systemFields onWrite → additive role merge (on create/parent/link)
→ _splitRecord → PB_TOP → PocketBase top-level field
```

**Logged by:** `_logChanges` auto-diff — ACL fields treated as regular data:
```javascript
{ field: '_allowed_read', from: ['roleprojecmanag'], to: ['roleprojecmanag', 'user062c67oyuz0'] }
```

Array diff shows exactly who was added or removed.

**Test result:** ✅
```json
{
  "field": "_allowed_read",
  "from": ["roleprojecmanag"],
  "to":   ["roleprojecmanag", "user0295tdhlz4y"]
}
```

---

### 4. Meta Channel — run_doc level fields

**Key pattern:** `.fieldname` (dot prefix)
**Example:** `{ '.view': 'form', '.operation': 'update' }`

**Pipeline:**
```
input['.view'] → _resolveInput → run_doc.view = 'form'
→ key deleted from input before _logChanges runs
```

**Logged by:** intentionally skipped — meta fields are framework-level routing
instructions, not business data. Stripping happens in `_resolveInput` before
`_logChanges` is called so they never reach the diff.

**Test result:** ✅
```
meta leaked into _changes: NO
subject (data channel in same call) captured: YES
```

---

### 5. File Channel — PocketBase multipart uploads

**Key pattern:** `files+` (append), `files-` (remove)
**Example:** `{ 'files+': File{name: 'photo.jpg'} }`

**Pipeline:**
```
input['files+'] → _mergeInput → doc['files+'] = File
→ _splitRecord detects +/- suffix → routes to top{} as FormData
→ PocketBase processes multipart upload
→ PB generates filename suffix: 'photo_9co315nsai.jpg'
→ pbResult.files contains final filenames
```

**Why auto-diff fails here:**
At the time `_logChanges` runs (before `_mergeInput`):
- `input['files+']` = `File` binary object — not a filename
- Final filename = unknown until PB responds

**Logged by:** explicit diff in `pb-adapter-pocketbase.js` after PB responds:
```javascript
// snapshot before upload
const filesBefore = Array.isArray(doc.files) ? [...doc.files] : []
const hasFileOp   = Object.keys(doc).some(k => /^[\w]+[+-]$/.test(k))

// after PB responds — filenames now known
const filesAfter = pbResult.files || []
await CW._logChanges(run_doc, [{
  field: 'files',
  from:  filesBefore,
  to:    filesAfter,
}])
```

**Test result:** ✅
```json
{
  "field": "files",
  "from": [],
  "to":   ["test_nprqlzsq66.jpg"]
}
```

PB-generated filename `test_nprqlzsq66.jpg` captured correctly.

---

## Channel Summary

| Channel | Key pattern | Processed by | Logged by | When |
|---------|------------|--------------|-----------|------|
| Data | `fieldname` | `_mergeInput` | auto-diff | before merge |
| Signal | `_state` | `_handleSignal` | auto-diff `sig[]` | before merge |
| ACL | `_allowed`, `_allowed_read` | `_mergeInput` + systemFields | auto-diff | before merge |
| Meta | `.fieldname` | `_resolveInput` | skipped | stripped before diff |
| File | `files+`, `files-` | `_splitRecord` in adapter | explicit diff | after PB responds |

---

## _logChanges — Two Modes

### Auto-diff mode (default)

Called from `CW.controller` before `_mergeInput`. Diffs `run_doc.input` against
current `doc` values:

```javascript
await CW._logChanges(run_doc)  // no second argument
```

Handles: Data, Signal, ACL channels.

### Explicit diff mode

Called from adapter after async operation completes. Caller provides pre-built
diff — used when the new value is only known after an external system responds:

```javascript
await CW._logChanges(run_doc, [{ field: 'files', from: [...], to: [...] }])
```

Handles: File channel. Pattern applies to any future async sideEffect with
unknown output at call time.

---

## _logChanges Skip List

Fields excluded from auto-diff:

```javascript
const skip = new Set(['_changes', 'modified', 'modified_by', 'creation'])
```

| Field | Reason |
|-------|--------|
| `_changes` | Circular — would log the log itself |
| `modified` | Stamped on every write — pure noise |
| `modified_by` | Same |
| `creation` | Set once at create, never changes |

---

## Re-entry Guard

`_logChanges` writes to PocketBase via the adapter. That write must not trigger
another `_logChanges` call. Guard via `options._logging`:

```javascript
if (run_doc.options?._logging) return
```

The fakeRun used for the log write sets `_logging: true`:

```javascript
options: { internal: true, render: false, _logging: true }
```

---

## Entry Format

```json
{
  "at":  1746000000000,
  "by":  "user062c67oyuz0",
  "op":  "update",
  "ch":  [{ "field": "priority", "from": "High", "to": "Medium" }],
  "sig": ["1.0_1"]
}
```

`ch` and `sig` only present when non-empty. Both can appear in the same entry
when a signal also modifies data fields.

---

## Hook Position in CW.controller

```
CW.controller
  → _resolveInput          ← strips meta (.field) keys
  → select (if needed)     ← populates target.data[0] with current values
  → _logChanges(run_doc)   ← AUTO-DIFF: input vs current doc
  → _mergeInput            ← old values gone after this
  → _clearInput
  → dispatch
      → _handlers.update
          → Adapter.update
              → _splitRecord     ← consumes files+/files-
              → PB responds
              → _logChanges(run_doc, explicitDiff)  ← EXPLICIT DIFF: files
```

Auto-diff must be before `_mergeInput` (needs old values).
Explicit diff must be after adapter responds (needs new filenames).
