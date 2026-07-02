# CW Change Logging — _changes

## Overview

Every record carries its own change history in `doc._changes` — a JSON array
appended on every write. No separate collection, no integration complexity.
Same ID, travels with the record, queryable as part of the document.

---

## Design Decisions

### Same document storage

`_changes` lives inside `data{}` on the same `item` record. This means:

- History has the same ACL as the record — whoever can read the record sees its history
- No join needed — history is always present when the record is fetched
- Same PocketBase ID — no foreign key, no lookup

Trade-off: history grows unbounded. Acceptable for business records where change
frequency is low. For high-frequency records (e.g. real-time collaborative docs),
a separate log doctype would be more appropriate.

### Append-only

Each write appends one entry to `_changes`. Entries are never modified or deleted.
The array is the audit trail.

### Two categories of changes

```
Field changes  → ch: [{ field, from, to }]
Signal changes → sig: ['1.0_1']
```

Both can appear in the same entry if a signal also modifies fields.

---

## Entry Format

```json
{
  "at":  1746000000000,
  "by":  "user062c67oyuz0",
  "op":  "update",
  "ch":  [
    { "field": "status",   "from": "Open",  "to": "Closed" },
    { "field": "priority", "from": "High",  "to": "Medium" }
  ],
  "sig": ["1.0_1"]
}
```

| Key | Type | Description |
|-----|------|-------------|
| `at` | timestamp | `Date.now()` at write time |
| `by` | string | `run_doc.user.name` — user ID who made the change |
| `op` | string | `create` or `update` |
| `ch` | array | Field diffs — only fields that actually changed |
| `sig` | array | FSM signals fired in this write (pending `""` state) |

`ch` and `sig` are only present when non-empty — no empty arrays stored.

---

## What Gets Logged

### Logged
- Any field in `run_doc.input` that differs from current `doc` value
- FSM signals (`_state` entries with value `""`)
- ACL changes (`_allowed`, `_allowed_read`)
- File changes (`files`)

### Skipped
```javascript
const skip = new Set(['_changes', 'modified', 'modified_by', 'creation'])
```

- `_changes` — would create circular log-the-log
- `modified` / `modified_by` — stamped on every write, pure noise
- `creation` — set once at create, never changes

---

## How It Works

### Hook position in CW.controller

```
CW.controller
  → _resolveInput
  → select (if update without target)
  → _logChanges          ← here — old values in doc, new values in input
  → _mergeInput          ← after this, old values are gone
  → _clearInput
  → dispatch (signal or handler)
```

Called before `_mergeInput` so both old (`doc`) and new (`input`) values are
available for diffing.

### The diff

```javascript
const changes = Object.entries(run_doc.input)
  .filter(([k]) => !skip.has(k) && k !== '_state')
  .map(([k, v]) => ({ field: k, from: doc[k] ?? null, to: v }))
  .filter(c => JSON.stringify(c.from) !== JSON.stringify(c.to))
```

Only fields that actually changed are recorded. No-op writes produce no entry.

### The write

`_logChanges` writes directly to the adapter — not through `CW.controller` —
to avoid re-triggering the logging pipeline:

```javascript
const fakeRun = {
  target_doctype: run_doc.target_doctype,
  target:         { data: [{ ...doc, _changes: next }] },
  query:          { where: { name: doc.name } },
  input:          { _changes: next },
  options:        { internal: true, render: false, _logging: true },
  user:           run_doc.user,
}
await globalThis.Adapter[CW._config.adapters.defaults.db].update(fakeRun)
```

`_logging: true` in options is a re-entry guard — `_logChanges` exits immediately
if this flag is set, preventing any write triggered by the log itself from
producing another log entry.

---

## Configuration

Controlled by `_config.systemSettings`:

```javascript
systemSettings: {
  logChanges: 1,   // 0 = disabled, 1 = enabled
}
```

Guard at top of `_logChanges`:

```javascript
if (!CW._config.systemSettings?.logChanges) return
```

Turn off for specific environments (e.g. test/seed scripts) by setting
`logChanges: 0`.

---

## systemFields Entry

```javascript
{ name: '_changes', fetch: false }
```

`fetch: false` — excluded from list view selects. Only fetched when the full
record is loaded (form view). No impact on grid performance.

Not in `PB_TOP` — stored inside `data{}` JSON, not a top-level PocketBase field.
No PocketBase schema change needed.

---

## Example Trail

```json
[
  {
    "at": 1746000000000, "by": "user062c67oyuz0", "op": "create",
    "ch": [{ "field": "subject", "from": null, "to": "Fix login bug" }]
  },
  {
    "at": 1746000060000, "by": "user062c67oyuz0", "op": "update",
    "ch": [{ "field": "priority", "from": "High", "to": "Medium" }]
  },
  {
    "at": 1746000120000, "by": "user062c67oyuz0", "op": "update",
    "sig": ["0.0_1"],
    "ch": [{ "field": "docstatus", "from": 0, "to": 1 }]
  },
  {
    "at": 1746000180000, "by": "user062c67oyuz0", "op": "update",
    "ch": [{
      "field": "_allowed_read",
      "from": ["roleprojecmanag"],
      "to":   ["roleprojecmanag", "user8xk2p4oyuz0"]
    }]
  },
  {
    "at": 1746000240000, "by": "user062c67oyuz0", "op": "update",
    "ch": [{
      "field": "files",
      "from": [],
      "to":   ["report_9co315nsai.pdf"]
    }]
  }
]
```

---

## SOC-2 Relevance

`_changes` covers:

- **CC6.2** — logical access changes tracked (ACL diffs in `_allowed`/`_allowed_read`)
- **CC6.8** — system changes logged with user, timestamp, before/after values
- **CC7.2** — anomalies detectable via change history per record

Gap: `_changes` is stored inside `data{}` which is readable by anyone with record
access. For SOC-2 Type 2, sensitive ACL change history may need to be in a
separate protected log. Current implementation is sufficient for SOC-2 Type 1.
