# CW Sharing Architecture

## Overview

Sharing in CW controls who can read and write any record via two top-level
PocketBase fields on every `item` record:

| Field | Purpose | PocketBase rule |
|-------|---------|----------------|
| `_allowed` | Write access — can edit the record | `update/delete` rule |
| `_allowed_read` | Read access — can view the record | `list/view` rule |

Both fields are arrays of IDs — a mix of User IDs and Role IDs.

---

## ID Types in Arrays

| Entry type | ID format | Example | Resolved from |
|-----------|-----------|---------|--------------|
| User | `user{hash}` | `user062c67oyuz0` | `UserPublicProfile.full_name` |
| Role | `role{hash}` | `rolesystemmanag` | `Role.role_name` |
| Public role | `roleispublixxxx` | — | Special — means world-readable |

Users and roles live in the same array. Distinguished by prefix pattern — roles have
human-readable semantic prefixes, users have `user` + 11-char hash.

---

## PocketBase Enforcement

Access control is enforced at the database level via PocketBase collection rules.
No CW code can bypass these.

**List/View rule** — who can read:
```
_allowed_read ?~ "roleispublixxxx" ||
(
  @request.auth.id != "" && (
    id = @request.auth.id ||
    owner = @request.auth.id ||
    _allowed ?~ @request.auth.id ||
    _allowed_read ?~ @request.auth.id ||
    _allowed ?~ @collection.item_users.role_id ||
    _allowed_read ?~ @collection.item_users.role_id
  )
)
```

**Update/Delete rule** — who can write:
```
@request.auth.id != "" && (
  owner = @request.auth.id ||
  _allowed ?~ @request.auth.id ||
  _allowed ?~ @collection.item_users.role_id
)
```

`item_users` is a SQLite view that flattens `_allowed_read` arrays of User records
into `(id, role_id)` pairs for efficient role membership lookups.

---

## How _allowed/_allowed_read Are Set

### At create time — systemFields onWrite

`_allowed` and `_allowed_read` are automatically populated from schema
`permissions` array on every create and update:

```javascript
// _allowed — roles with write/create permission
const roles = schema.permissions
  .filter(p => p.write === 1 || p.create === 1)
  .map(p => generateId('Role', p.role))

// _allowed_read — roles with read-only permission
const roles = schema.permissions
  .filter(p => p.read === 1 && !(p.write === 1 || p.create === 1))
  .map(p => generateId('Role', p.role))

// public records
if (schema.is_public) roles.push('roleispublixxxx')
```

This means every record automatically gets the right role-based access from schema
without any manual intervention.

### At share time — SharePanel

Individual users or additional roles are added/removed via the `SharePanel`
component, which writes directly to `_allowed` and `_allowed_read`.

---

## SharePanel Component

### Placement

`SharePanel` is a `fieldtype: 'SharePanel'` field in schema — rendered by
`FieldRenderer` like any other field, placed at the bottom of `MainForm`.

```json
{
  "fieldname": "_allowed",
  "fieldtype": "SharePanel",
  "label":     "Sharing"
}
```

One field entry manages both `_allowed` and `_allowed_read` — the component
reads both arrays from `doc` directly.

### What it renders

```
✏️ Can edit
  [ 👤 Denis × ][ 🔑 System Manager × ]  [ Search... ▾ ]

👁 Can view
  [ 🔑 Desk User × ][ 🌐 Public × ]      [ Search... ▾ ]
```

Two `MultiSelectPanel` instances — one for write, one for read.

### Search sources

Two sources searched simultaneously:

| Source | Label field | Icon | ID transform |
|--------|------------|------|-------------|
| `UserPublicProfile` | `full_name` | 👤 | `usep{hash}` → `user{hash}` |
| `Role` | `role_name` | 🔑 | none |

Email is never shown — only `full_name` from `UserPublicProfile`. This is by
design — `User` item records are admin-only, `UserPublicProfile` is world-readable
and contains only safe public fields.

### ID transform on select

`UserPublicProfile` has ID `usep{hash}`. `_allowed`/`_allowed_read` store
`user{hash}`. On select, the transform converts:

```javascript
transform: (id) => 'user' + id.slice(4)
// usep062c67oyuz0 → user062c67oyuz0
```

Same hash suffix — just swap the 4-char prefix. Works because all user-related
doctypes share the same `hashEmail()` output.

### Write-back

On change, `SharePanel` fires a `run_doc.child` update directly:

```javascript
run_doc.child({
  operation:      'update',
  target_doctype: doctype,
  query:          { where: { name: doc.name } },
  input:          { _allowed: next },
  options:        { internal: true, render: false },
})
```

`internal: true` bypasses the `docstatus === 0` editability gate — sharing is
allowed on submitted records too.

---

## MultiSelectPanel — Shared Primitive

`SharePanel` and `RelationshipPanel` both use `MultiSelectPanel` for the
search + select + tag UI pattern.

### Props

```javascript
MultiSelectPanel({
  sources,   // [{ doctype, labelField, icon, transform }]
  value,     // string[] — current array of IDs
  onChange,  // (newArray) => void
  readOnly,  // bool
  run_doc,   // for child select runs
  grouped,   // bool — show source name as group header in dropdown
})
```

### Source definition

```javascript
{
  doctype:    'UserPublicProfile',  // doctype to search
  labelField: 'full_name',          // field to display
  icon:       '👤',                 // shown in tags and dropdown
  transform:  (id) => '...',        // optional ID transform on select
}
```

### Label resolution

Selected IDs are resolved to display labels by fetching all source records on
mount. This handles IDs that were added before the current session — e.g. roles
set by systemFields at create time.

### Behaviour

- Tags shown for all selected IDs with resolved labels
- `×` button per tag removes from array, calls `onChange`
- Search input triggers async fetch from all sources simultaneously
- Dropdown groups results by source when `grouped: true`
- Already-selected IDs excluded from dropdown results

---

## Component Hierarchy

```
FieldRenderer
  → fieldtype: 'SharePanel'
      → SharePanel
          → MultiSelectPanel (for _allowed)
          → MultiSelectPanel (for _allowed_read)

FieldRenderer
  → fieldtype: 'Relationship Panel'
      → RelationshipPanel
          → MultiSelectPanel (for record search in add form)
```

---

## readOnly Behaviour

`SharePanel` receives `readOnly` from `FieldRenderer`:

```javascript
const readOnly = (doc.docstatus ?? 0) !== 0 || !['update','create'].includes(run_doc.operation)
```

When `readOnly`:
- Tags shown without `×` buttons
- Search input hidden
- Current access list is display-only

Note: `SharePanel` is placed **above** the readOnly short-circuit in
`FieldRenderer` dispatch so it handles its own readOnly state rather than
being replaced by a plain text input.

---

## Security Model Summary

| Layer | Enforcement | Bypass possible |
|-------|------------|----------------|
| PocketBase rules | DB level, always applied | No |
| systemFields onWrite | Adds role-based access from schema | No — fires on every write |
| SharePanel | User-initiated per-record sharing | Yes — only for users with write access |
| `internal: true` | Bypasses docstatus gate for sharing | Yes — but PB rules still apply |

The PocketBase rules are the authoritative enforcement layer. Everything else
is convenience — systemFields sets sensible defaults, SharePanel lets users
manage access within what PB rules permit.
