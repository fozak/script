# CW Relationship System

## Overview

The Relationship system is a universal child doctype that connects any two records across any doctypes. It replaces individual Link fields (`assigned_to`, `customer`, `event_organizer`) with a single, flexible structure that handles business relationships, access control, and lifecycle management in one place.

---

## Architecture

### Single Child Doctype — `Relationship`

Every relationship in the system is a record of this one doctype, stored as a child of the parent document.

```
Task (parent)
  └── Relationship: John Smith | Assignee  | Submitted
  └── Relationship: Jane Doe  | Reviewer   | Submitted
  └── Relationship: PROJ-001  | Belongs To | Submitted

Event (parent)
  └── Relationship: John Smith  | Speaker   | Draft
  └── Relationship: Acme Corp   | Sponsor   | Submitted
  └── Relationship: Summer Conf | Follow-up | Submitted
```

### Fields

| Field | Type | Description |
|---|---|---|
| `related_doctype` | Data | The doctype of the related record (e.g. `User`, `Organization`) |
| `related_name` | Data | The PocketBase record id of the related record |
| `related_title` | Data | Display name — denormalized for performance |
| `type` | Select | The relationship type (e.g. `Assignee`, `Sponsor`) |
| `notes` | Text | Optional context or reason for the relationship |

### Lifecycle (FSM dim 0)

```
Draft (0) ──── Accept ────► Submitted (1)
    │                            │
    └──── Reject ────► Cancelled (2) ◄─── Cancel
                           │
                        Reopen
                           │
                           ▼
                        Draft (0)
```

| State | Meaning | Access effect |
|---|---|---|
| Draft (0) | Requested, pending acceptance | No access granted |
| Submitted (1) | Active, accepted | Access granted per `relationshipAccessMap` |
| Cancelled (2) | Ended or rejected | Access revoked |

---

## Configuration (`CW-config.js`)

### `relationshipTypes`

Defines which relationship types are valid for each parent→related doctype pair. Drives the type dropdown in the UI.

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

Key: `parentDoctype → relatedDoctype → [types]`

When a user opens the Relationship panel on a `Task`, they only see types relevant to Task. Selecting `Assignee` automatically knows the related doctype is `User` — no extra step.

### `relationshipAccessMap`

Defines what system access is granted when a User relationship is Submitted.

```javascript
relationshipAccessMap: {
  "Task": {
    "User": {
      "Assignee": "write",   // → added to parent._allowed (can edit)
      "Reviewer": "read",    // → added to parent._allowed_read (can read)
      "Observer": "read",    // → added to parent._allowed_read
    },
    "Task":    { "Blocks": "none", "Blocked By": "none", "Related": "none" },
    "Project": { "Belongs To": "none" },
  },
  "Event": {
    "User": {
      "Attendee":        "read",
      "Speaker":         "read",
      "Volunteer":       "read",
      "Organizer":       "write",
      "Sponsor Contact": "read",
    },
    "Organization": { "Sponsor": "none", "Partner": "none" },
  },
}
```

Key: `parentDoctype → relatedDoctype → type → "write" | "read" | "none"`

Three access levels:
- `write` → user id added to parent `_allowed` — user can edit the parent record
- `read` → user id added to parent `_allowed_read` — user can read but not edit
- `none` → relationship exists for business purposes only, no PocketBase access change

---

## Access Control Integration

`_allowed` and `_allowed_read` are PocketBase top-level relation fields. They drive PocketBase access rules at the database level — no application-layer permission checks needed.

When a Relationship transitions:

**Accept (0 → 1):**
```
sideEffect: fetch parent → add related_name to _allowed or _allowed_read → PATCH parent
```

**Cancel (1 → 2) or Reject (0 → 2):**
```
sideEffect: fetch parent → remove related_name from _allowed or _allowed_read → PATCH parent
```

**Reopen (2 → 0):**
```
sideEffect: fetch parent → add related_name back → PATCH parent
```

Only applies when `related_doctype === 'User'` and `access !== 'none'`. Organization/Task/Project relationships have no access effect.

---

## UI — `RelationshipPanel`

Added as a new fieldtype `"Relationship Panel"` in `FieldRenderer`. Rendered full-width (`col-12`) in `MainForm`.

### Adding to a schema

```json
{
  "fieldname": "relationships",
  "fieldtype": "Relationship Panel",
  "label": "Relationships"
}
```

### What it shows

```
Relationships

  John Smith    Assignee    [Submitted]    [Cancel]
  Jane Doe      Reviewer    [Draft]        [Accept] [Reject]
  PROJ-001      Belongs To  [Submitted]    [Cancel]

  [Type ▼]  [Search User...]  [Notes...]  [+ Add]
```

### Add flow

1. Select type from dropdown — only types configured for this doctype are shown
2. `related_doctype` is inferred automatically from config — no extra step
3. Search field filters available records of that doctype
4. Optional notes
5. `+ Add` creates the Relationship in Draft state
6. Owner or authorized user clicks Accept to activate

### FSM buttons per relationship

| Current state | Buttons shown |
|---|---|
| Draft | Accept, Reject |
| Submitted | Cancel |
| Cancelled | Reopen |

---

## Benefits

### 1. Universal — one pattern for everything

Instead of separate Link fields (`assigned_to`, `organizer_id`, `reviewed_by`, `blocked_by`), every connection is a Relationship record. Any doctype can relate to any other doctype without schema changes.

### 2. Access control as a consequence of relationship

Granting a user access to a document is not a separate admin action — it happens automatically when a Relationship is accepted. Revoking access happens automatically on cancel. No manual `_allowed` management needed.

### 3. Relationship history

Relationships are records — they persist even when cancelled. You have a full audit trail: who was assigned when, who approved it, when it was ended.

### 4. Multiple relationships of the same type

A Task can have three Assignees. An Event can have five Speakers. No schema change needed — just add more Relationship records.

### 5. Queryable across all doctypes

"Show me everything John is involved in" — query Relationship where `related_name = johnId`. Returns Tasks (Assignee), Events (Speaker), Projects (Reviewer) — regardless of doctype.

### 6. Deployment-configurable types

`relationshipTypes` and `relationshipAccessMap` live in config, not schema. Adding a new relationship type for a deployment (e.g. `"Moderator"` for Events) requires only a config change — no schema migration, no code change.

### 7. Workflow-ready

The Draft → Submitted lifecycle supports approval workflows. A member can request to join an event (Draft), an organizer accepts (Submitted → access granted). Rejection (Cancelled) is also tracked.

### 8. Exponanta-specific applications

| Use case | Parent | Related | Type | Access |
|---|---|---|---|---|
| Event registration | Event | User | Attendee | read |
| Chapter leadership | Session | User | Organizer | write |
| Referral tracking | Member | Member | Referral | none |
| Task assignment | Task | User | Assignee | write |
| Sponsorship | Event | Organization | Sponsor | none |
| Peer review | Task | User | Reviewer | read |

---

## Implementation Files

| File | Role |
|---|---|
| `Relationship-schema.json` | Doctype definition + FSM + sideEffects |
| `CW-config.js` | `relationshipTypes` + `relationshipAccessMap` |
| `CW-ui.js` | `RelationshipPanel` component + FieldRenderer integration |
| `CW-run.js` | `_execTransition` docstatus sync + `_handlers.update` select strip |
| `pb-adapter-pocketbase.js` | `_mergeRecord` / `_splitRecord` for `_allowed`/`_allowed_read` top-level fields |
