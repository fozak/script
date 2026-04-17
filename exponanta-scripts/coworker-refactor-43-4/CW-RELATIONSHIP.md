# CW Relationship System

Documents the Relationship doctype, ACL sideEffects, RelationshipPanel React component,
and configuration. Status as of April 15, 2026.

---

## Overview

`Relationship` is a generic junction doctype that connects any CW document to any other
document or user. It handles both business relationships (Attendee, Speaker, Organizer)
and access control — when a Relationship is accepted, the related user gains access to
the parent document automatically via FSM sideEffects.

---

## Relationship Doctype Schema

```json
{
  "schema_name": "Relationship",
  "doctype": "Schema",
  "is_child": 1,
  "is_submittable": 1,
  "title_field": "related_title",
  "autoname": "generateId",
  "fields": [
    { "fieldname": "related_doctype", "fieldtype": "Data",   "label": "Related Doctype", "reqd": 1, "in_list_view": 1 },
    { "fieldname": "related_name",    "fieldtype": "Data",   "label": "Related Name",    "reqd": 1, "in_list_view": 1 },
    { "fieldname": "related_title",   "fieldtype": "Data",   "label": "Related Title",              "in_list_view": 1 },
    { "fieldname": "type",            "fieldtype": "Select", "label": "Type", "options": "",         "in_list_view": 1 },
    { "fieldname": "notes",           "fieldtype": "Text",   "label": "Notes" }
  ]
}
```

**Key design decisions:**

- `type` options are empty string in schema — types are declared in `CW._config.relationshipTypes`, not in the schema. Any string value is valid.
- `is_child: 1` — Relationship records always belong to a parent document via `parent` / `parenttype` / `parentfield` system fields.
- `related_doctype` + `related_name` are plain `Data` fields (not `Link`) because they reference any doctype dynamically.

---

## FSM States

| State | Label | Meaning |
|---|---|---|
| 0 | Draft | Pending — not yet accepted |
| 1 | Submitted | Accepted — access granted to parent |
| 2 | Cancelled | Cancelled — access revoked from parent |

**Transitions:**

| Transition | Label | Confirm |
|---|---|---|
| `0→1` | Accept | — |
| `0→2` | Reject | "Reject this relationship?" |
| `1→2` | Cancel | "Cancel this relationship?" |
| `2→0` | Reopen | — |

---

## SideEffects — ACL Propagation

Every FSM transition fires a sideEffect that patches `_allowed` or `_allowed_read`
on the **parent document** based on `CW._config.relationshipAccessMap`.

### How it works

1. Read `rec` = the Relationship record
2. Look up `relationshipAccessMap[parenttype][related_doctype][type]` → `'write'` | `'read'` | `'none'`
3. If `none` or `related_doctype !== 'User'` → exit (business relationship only, no ACL effect)
4. Fetch parent document via `run_doc.child(select)`
5. Patch `_allowed` (write) or `_allowed_read` (read) on parent

### Transition → ACL action

| Transition | ACL action |
|---|---|
| `0→1` Accept | Add `related_name` to `_allowed` or `_allowed_read` |
| `1→2` Cancel | Remove `related_name` from `_allowed` or `_allowed_read` |
| `2→0` Reopen | Re-add `related_name` to `_allowed` or `_allowed_read` |

### Critical implementation notes

- sideEffects use `run_doc.child()` — not naked `CW.run()`. Previous versions used naked `CW.run` which caused silent ACL failures because `CW.run` was not awaited and `CW.controller` was called manually after an already-resolved run.
- The update child run sets `options: { render: false, internal: true }` — `internal: true` bypasses the docstatus editable check so system can patch `_allowed` on submitted parent documents.

---

## Configuration

### `CW._config.relationshipTypes`

Declares which relationship types are available per `parenttype` + `related_doctype`.
Drives the type dropdown in `RelationshipPanel` UI.

```javascript
relationshipTypes: {
  "Event": {
    "User":         ["Attendee", "Speaker", "Volunteer", "Organizer", "Sponsor Contact"],
    "Organization": ["Sponsor", "Partner", "Media Partner"],
    "Event":        ["Related Event", "Follow-up Event"],
  },
  "Task": {
    "User":         ["Assignee", "Reviewer", "Observer"],
    "Task":         ["Blocks", "Blocked By", "Related"],
    "Project":      ["Belongs To"],
  },
}
```

### `CW._config.relationshipAccessMap`

Declares what access each type grants when the Relationship is accepted (`0→1`).

```javascript
relationshipAccessMap: {
  "Event": {
    "User": {
      "Attendee":        "read",   // → _allowed_read
      "Speaker":         "read",
      "Volunteer":       "read",
      "Organizer":       "write",  // → _allowed
      "Sponsor Contact": "read",
    },
    "Organization": {
      "Sponsor":       "none",     // business only, no system access
      "Partner":       "none",
      "Media Partner": "none",
    },
    "Event": {
      "Related Event":   "none",
      "Follow-up Event": "none",
    },
  },
  "Task": {
    "User": {
      "Assignee": "write",
      "Reviewer": "read",
      "Observer": "read",
    },
    "Task":    { "Blocks": "none", "Blocked By": "none", "Related": "none" },
    "Project": { "Belongs To": "none" },
  },
}
```

**Access values:**

| Value | Effect on `0→1` |
|---|---|
| `write` | `related_name` added to parent `_allowed` |
| `read` | `related_name` added to parent `_allowed_read` |
| `none` | No ACL change — business relationship only |

---

## Schema Field Requirement

`RelationshipPanel` only renders when the parent doctype schema declares a field
with `fieldtype: Relationship Panel`. This is an explicit opt-in — not every doctype
needs a relationship panel.

```json
{
  "fieldname": "relationships",
  "fieldtype": "Relationship Panel",
  "label": "Relationships"
}
```

**Rules:**
- Only add this field to doctypes that have entries in `relationshipTypes`
- The `fieldname` value (`relationships`) is used as `parentfield` when querying child Relationship records
- `FieldRenderer` renders `RelationshipPanel` component when it encounters this fieldtype
- Doctypes without this field never show the panel regardless of config

---

## RelationshipPanel React Component

Located in `CW-ui.js`. Renders as a section at the bottom of `MainForm`.

### What it does

- Loads all Relationship records for the current document on mount
- Shows each relationship with: `related_title`, `type`, status badge, FSM action buttons
- Provides UI to add new relationships: type selector → related document search → notes → Add button
- FSM buttons (Accept/Reject/Cancel/Reopen) fire `run_doc.child(update)` with `_state` signal
- After any action, reloads relationship list

### Data flow

```
MainForm renders
  → FieldRenderer encounters fieldtype: Relationship Panel
  → renders RelationshipPanel({ run_doc })
  → useEffect fires loadRels()
  → run_doc.child(select Relationship where parent=doc.name)
  → renders list of relationships with FSM buttons
```

### Type dropdown population

```javascript
// typeMap built from CW._config.relationshipTypes[doctype]
// { "Attendee": "User", "Speaker": "User", "Sponsor": "Organization", ... }
const typeMap = useMemo(() => {
  const dtConf = CW._config?.relationshipTypes?.[doctype] || {}
  // maps type → relatedDoctype
}, [doctype])
```

### Adding a relationship

```javascript
run_doc.child({
  operation:      'create',
  target_doctype: 'Relationship',
  input: {
    related_doctype: typeMap[selType],
    related_name:    selName,
    related_title:   selTitle,
    type:            selType,
    notes:           notes,
    parent:          docName,
    parenttype:      doctype,
    parentfield:     'relationships',
  },
  options: { render: false },
})
```

New Relationship starts at `docstatus=0` (Draft/Pending). Host or admin must Accept it
to trigger ACL propagation.

### FSM action on existing relationship

```javascript
run_doc.child({
  operation:      'update',
  target_doctype: 'Relationship',
  query:          { where: { name: rel.name } },
  input:          { _state: { [btnKey]: '' } },
  options:        { render: false, internal: true },
})
```

---

## Booking Flow Integration

For 1:1 session booking, two Relationship records are created programmatically
(not via the panel UI):

```
Event created (guest = owner)
  ↓
Organizer Relationship created for host
  _state: 0→1 immediately (auto-accepted)
  sideEffect: hostId → Event._allowed (write access)
  ↓
Attendee Relationship created for guest
  _state: 0 (pending email verification)
  ↓
Guest verifies email → Attendee 0→1
  sideEffect: guestId → Event._allowed_read (read access)
```

The `_allowed` on each Relationship record itself should be set at create time
so each party can manage their own relationship:

```javascript
// Organizer Relationship input
_allowed: [hostId, 'rolesystemmanag']

// Attendee Relationship input  
_allowed: [guestId, 'rolesystemmanag']
```

This requires `_preflight` to **merge** input `_allowed` with owner rather than
overwrite — currently pending implementation.

---

## Known Issues / Pending

| Issue | Status |
|---|---|
| `_preflight` overwrites `_allowed` instead of merging | Pending fix — needed for booking flow |
| `Relationship._allowed` not set at create time | Pending — currently only owner in `_allowed` |
| `User-r4z3xglgikait5uOrganizer` malformed related_name in test data | Data issue — bad record in PB |
| Duplicate Relationship records for same user+type | No deduplication guard at create time |
