# CW systemFields — Consolidated System Field Definitions

## Overview

All system-level fields are defined once in `CW._config.systemFields`. This is
the single source of truth for:

- **Write logic** — `onWrite` / `onCreate` handlers that fire on every record
- **Fetch behavior** — whether the field is included in select results
- **UI rendering** — whether and how the field appears in `MainForm`

No doctype schema needs to redeclare these fields. Every doctype inherits them
automatically.

---

## Why Consolidated

Previously there were two separate concerns:

1. **`_config.systemFields`** — write logic only (`onWrite`, `onCreate`, `fetch`)
2. **Schema `fields` array** — UI rendering per doctype

This created redundancy — `files` and `_allowed` had to be added to every
doctype schema manually to appear in `MainForm`. If forgotten, sharing and file
attachments silently didn't appear.

The consolidation adds UI metadata (`fieldtype`, `label`, `hidden`, `read_only`,
`in_list_view`) directly to each `systemFields` entry. `MainForm` now derives
system field UI from `_config.systemFields` automatically — no per-doctype
schema entries needed.

---

## Field Entry Format

```javascript
{
  // identity
  name:         'owner',
  fetch:        true,          // include in select results

  // UI metadata
  hidden:       0,             // 1 = never show in MainForm
  read_only:    1,             // 1 = render as read-only
  fieldtype:    'Data',        // FieldRenderer fieldtype
  label:        'Owner',       // shown as form label
  in_list_view: 0,             // 1 = shown in MainGrid columns

  // write logic
  onCreate: (run_doc) => { ... },   // fires on create only
  onWrite:  (run_doc) => { ... },   // fires on create + update
}
```

Fields with `hidden: 1` or no `fieldtype` are never rendered in `MainForm`.

---

## Full Field Inventory

### Pure system — hidden, never rendered

| Field | Purpose |
|-------|---------|
| `doctype` | Stamps doctype name on every record |
| `name` | Generates deterministic ID via `generateId` + `autoname` |
| `docstatus` | Initializes to `0` on create |
| `_state` | FSM signal history — managed by CW-run, never edited directly |
| `top_parent` | Tracks root parent for nested child records |
| `parent` | Child record parent name |
| `parenttype` | Child record parent doctype |
| `parentfield` | Child record parent fieldname |
| `idx` | Child record order index |

### Visible, read-only — shown in MainForm but not editable

| Field | Fieldtype | Label |
|-------|-----------|-------|
| `creation` | `Datetime` | Created |
| `owner` | `Data` | Owner |
| `modified` | `Datetime` | Modified |
| `modified_by` | `Data` | Modified By |

### UI-relevant, editable — full component rendering

| Field | Fieldtype | Label | Purpose |
|-------|-----------|-------|---------|
| `files` | `Filepicker` | Attachments | File upload/download per record |
| `_allowed` | `SharePanel` | Sharing | Write + read access management |

`_allowed_read` is `hidden: 1` — managed internally by `SharePanel` and
`systemFields onWrite`, never shown as a separate field.

---

## How MainForm Uses systemFields

`MainForm` appends system fields after schema fields:

```javascript
const schemaFields = schema.fields || []
const systemFields = (CW._config.systemFields || [])
  .filter(sf => !sf.hidden && sf.fieldtype)
  .filter(sf => !schemaFields.find(f => f.fieldname === sf.fieldname))
  .map(sf => ({
    fieldname:    sf.name,
    fieldtype:    sf.fieldtype,
    label:        sf.label || sf.name,
    read_only:    sf.read_only || 0,
    in_list_view: sf.in_list_view ?? 0,
  }))

const fields = [...schemaFields, ...systemFields]
```

Two rules:
- `hidden: 1` or missing `fieldtype` — filtered out, never rendered
- If doctype schema already defines the same `fieldname` — schema wins, system default skipped

---

## How CW-run Uses systemFields

`_preflight` iterates `systemFields` on every write:

```javascript
for (const sf of CW._config.systemFields || []) {
  if (sf.onWrite)                     sf.onWrite(run_doc)
  if (sf.onCreate && op === 'create') sf.onCreate(run_doc)
}
```

Fires regardless of doctype. Every record gets `doctype` stamped, `name`
generated, `modified` updated, `_allowed`/`_allowed_read` populated from schema
permissions automatically.

---

## The Two Cross-Doc UI Components

### Filepicker (`files`)

Every record can have file attachments. Drag-drop upload zone + thumbnail list.
Manages its own state via `run_doc.child` update + select cycle. Prebuilt ES
module (`filepicker.js`) loaded lazily.

### SharePanel (`_allowed`)

Every record has sharing controls. Two `MultiSelectPanel` instances — one for
write access (`_allowed`), one for read access (`_allowed_read`). Searches
`UserPublicProfile` by `full_name` and `Role` by `role_name`. Email never shown.
Pure React in `CW-ui.js`, no prebuilt module needed.

Both appear on every doctype's `MainForm` without any schema configuration.

---

## Override Pattern

To hide a system field on a specific doctype, declare it in schema with `hidden: 1`:

```json
{ "fieldname": "files", "fieldtype": "Filepicker", "hidden": 1 }
```

To change label or position, declare it at the desired position in `fields`:

```json
{ "fieldname": "_allowed", "fieldtype": "SharePanel", "label": "Access Control" }
```

Schema definition takes precedence over system default.

---

## Summary

```
_config.systemFields
  write logic (onWrite/onCreate)  →  CW-run._preflight
  fetch flag                      →  CW-run._handlers.select
  UI metadata (fieldtype/hidden)  →  MainForm field rendering
```

One definition. Three consumers. No duplication across doctypes.
