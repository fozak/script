
2 different approaches below (the merging intoRelationship is doubtful)

Three things happen in pipeline. User sees none of it.You said: what is final proposal.what is final proposal. do we use existing relationship type by extending it, or something else1:47 PMClaude responded: Use existing Relationship — extend it.Use existing Relationship — extend it.
What stays:

parent, parenttype, parentfield, related_doctype, related_name, related_title, type
Existing FSM dim 0 (Draft→Active→Cancelled)
Existing relationshipAccessMap → _allowed propagation

What gets added:

New fields on Relationship schema:

due_date        — Datetime, optional
priority        — Select (Low/Medium/High), optional  
notes           — Text, optional
assigned_by     — Link:User, auto-set on create

type_access in Relationship schema — replaces relationshipAccessMap in config:

json"type_access": {
  "Assignee":  "write",
  "Reviewer":  "write",
  "Follower":  "read",
  "Viewer":    "read",
  "CC":        "read"
}

Parent dim 1 sync in sideEffect — 0→1 Accept also sets parent._state["1"] = 1, 1→2 Cancel sets it back to 0.
Virtual assigned_to field on parent doctypes — renders as User picker, fires Relationship create + 0→1 signal in one step.

What gets removed:

relationshipAccessMap from CW._config — replaced by schema type_access

No new doctype. No new collection. Same Relationship record, extended. Backward compatible — existing Relationship records keep working.You said: i like config more for relationshipAccessMap from CW.i like config more for relationshipAccessMap from CW._config —1:50 PMClaude responded: Good.Good. Keep relationshipAccessMap in CW._config. It's cross-doctype configuration — belongs in config, not in Relationship schema. Schema defines the Relationship structure, config defines how relationship types map to access levels across the system.
So final proposal:
What stays unchanged:

relationshipAccessMap in CW._config
Existing Relationship fields and FSM dim 0
_allowed propagation via sideEffects

What gets added to Relationship schema:
due_date     — Datetime, optional
priority     — Select, optional
notes        — Text, optional
assigned_by  — Link:User, auto-set on create via systemField onCreate
What gets added to parent doctypes:

Virtual assigned_to field — User picker, fires Relationship create + 0→1 in one step
Dim 1 in SystemSchema _state — _assignment (Unassigned/Assigned), driven by Relationship sideEffect

What gets added to Relationship sideEffects:

0→1 also syncs parent _state["1"] = 1
1→2 also syncs parent _state["1"] = 0

That's the complete picture. Minimal changes, backward compatible, config stays in config, schema stays clean.
Ready to implement any piece of this?You said: before implementatoin.before implementatoin. can it be symmetrical. not gowing after each doc and assign manullay but using FSM and bulk buttons in UniversalGrid and bulk assign1:53 PMClaude responded: Yes.Yes. Perfectly symmetrical.
Single doc assignment (form):
Virtual assigned_to field → picks User → fires child run → creates Relationship + 0→1 signal
Bulk assignment (UniversalGrid):
Select N docs → bulk bar shows "Assign" button → picker appears → fires N child runs → creates N Relationships + 0→1 signals
Same FSM signal 1.0_1, same sideEffect, same _allowed propagation. The only difference is N child runs instead of 1.
But the "Assign" bulk button needs a User picker — it's not a pure FSM signal like "Submit" or "Approve" which need no input. It needs run_doc.input._assign_to set before firing.
So the bulk bar needs two states for assignment:
[Assign ▼]  →  opens User picker inline in bulk bar
             →  user picks assignee
             →  [Confirm Assign] fires N child runs
Or simpler — a Link field inline in the bulk bar that sets _assign_to, then fires the signal.
This is the same pattern as Relationship add in Table mode — pick, then confirm. Same component could handle both.
The symmetry is complete — single doc and bulk both go through the same FSM signal, same sideEffect, same _allowed propagation. Scale is the only difference.





# CW Assignment Architecture — Proposal

## Problem

Assignment in CW has two distinct concerns that must not be conflated:

1. **Access** — who can read/write a record (`_allowed`, `_allowed_read`)
2. **Action** — who is responsible for doing something with a record (assignment)

A simple `assignee` field on the document conflates both. It doesn't support
multiple assignees, has no lifecycle, produces no inbox, and scatters assignment
history away from the action context.

---

## Three Relationship Types — Clarified

### `_allowed` / `_allowed_read` — Access Control
Flat arrays on every record. Managed by `systemFields onWrite` and `SharePanel`.
PocketBase rules enforce at DB level. Not a doctype — pure ACL mechanism.

### `Relationship` — Structural Connections
Links between documents that have semantic meaning:
- "Task blocks Task-002"
- "Contact is related to Company"
- "Invoice references Contract"

Bi-directional, developer/power-user facing. Managed via `RelationshipPanel`.
Not for assignments — using `type: "Assigned To"` here is technically correct
but business-confusing.

### `ToDo` — Action Items / Assignments
Child records representing work to be done. User-facing, inbox-driven.
Clear business semantics — everyone understands "todo".

---

## ToDo as Proper Child

`ToDo` is a standard CW child doctype — uses `parent`/`parenttype`/`parentfield`
like all other child records. This gives:

- **ACL inheritance** — `_allowed.onWrite` fires automatically, child inherits
  parent access. No manual permission wiring.
- **Standard child select** — `query: { where: { parent: docName, parentfield: 'todos' } }`
- **`_changes` on child** — assignment lifecycle logged on the ToDo record itself
- **Clean parent form** — appears as a `Table` fieldtype section, not mixed into `RelationshipPanel`

---

## ToDo Schema

```json
{
  "schema_name": "ToDo",
  "title_field": "description",
  "fields": [
    {
      "fieldname": "assigned_to",
      "fieldtype": "Data",
      "label":     "Assigned To",
      "in_list_view": 1,
      "reqd": 1
    },
    {
      "fieldname": "due",
      "fieldtype": "Date",
      "label":     "Due Date",
      "in_list_view": 1
    },
    {
      "fieldname": "priority",
      "fieldtype": "Select",
      "label":     "Priority",
      "options":   "Low\nMedium\nHigh",
      "default":   "Medium",
      "in_list_view": 1
    },
    {
      "fieldname": "description",
      "fieldtype": "Text",
      "label":     "Description",
      "in_list_view": 0
    }
  ],
  "permissions": [
    { "role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1 }
  ]
}
```

`assigned_to` stores `user{hash}` — the User item ID. Display name resolved from
`UserPublicProfile` when rendering.

---

## FSM on ToDo

ToDo lifecycle via dim 0:

```json
"0": {
  "values":  [0, 1, 2],
  "options": ["Open", "Done", "Cancelled"],
  "transitions": {
    "0": [1, 2],
    "1": [0],
    "2": [0]
  },
  "labels": {
    "0_1": "Done",
    "0_2": "Cancel",
    "1_0": "Reopen",
    "2_0": "Reopen"
  }
}
```

Assignee can mark Done or Cancel without touching the parent document.
FSM buttons appear in the `Table` fieldtype row actions.

---

## Parent Schema Addition

Any doctype that supports todos adds a `Table` field:

```json
{
  "fieldname": "todos",
  "fieldtype": "Table",
  "label":     "To Do",
  "options":   "ToDo"
}
```

Appears as a dedicated section in `MainForm`. Separate from `RelationshipPanel`.

---

## Inbox View

Because `assigned_to` and `parenttype` are stored on every `ToDo`, the inbox
query works across all doctypes:

```javascript
CW.run({
  operation:      'select',
  target_doctype: 'ToDo',
  query: {
    filter: `data.assigned_to = "${currentUser}" && docstatus = 0`
  }
})
```

Returns all open todos for the current user regardless of parent doctype.
`parenttype` + `parent` on each record tells you what to navigate to.

---

## ACL Inheritance Flow

```
User creates ToDo on Invoice invoice3466
  → CW.run create ToDo
      → _preflight → systemFields onCreate
          → name generated
          → parent = 'invoice3466', parenttype = 'Invoice', parentfield = 'todos'
      → systemFields onWrite
          → _allowed.onWrite
              → hasParent = true  ← because parent/parenttype set
              → parentRun._allowed pushed into ToDo._allowed
              → ToDo inherits Invoice's full access list
          → _allowed_read.onWrite → same
```

No manual permission wiring. Child inherits parent automatically.

---

## Activity Feed — Scattered Storage, Unified View

`_changes` is stored on each record independently:

```
Invoice invoice3466._changes  →  field edits, ACL changes, signals
ToDo    todo8xk2._changes     →  Open→Done, due date change, reassignment
```

The UI assembles a unified timeline:

```javascript
const invoiceChanges = doc._changes || []

const todoRun = await run_doc.child({
  operation:      'select',
  target_doctype: 'ToDo',
  query:          { where: { parent: doc.name, parentfield: 'todos' } },
  options:        { render: false }
})

const todoChanges = todoRun.target.data
  .flatMap(todo => (todo._changes || [])
    .map(c => ({ ...c, ref: todo.name, ref_type: 'ToDo' })))

const timeline = [...invoiceChanges, ...todoChanges]
  .sort((a, b) => a.at - b.at)
```

Storage is per-record. View is unified. Consistent with parent-child architecture.

---

## Comparison — Relationship vs ToDo

| Concern | `Relationship` | `ToDo` |
|---------|---------------|--------|
| Use case | Structural links | Action items |
| Direction | Bi-directional | Child of parent |
| ACL | Inherited via parent_run_id | Inherited via parent/parenttype |
| Inbox | Not natural | Native — query by assigned_to |
| Lifecycle | FSM via RelationshipPanel | FSM via Table row actions |
| Business clarity | Low ("add relationship") | High ("add todo") |
| History | Own `_changes` | Own `_changes` |

---

## What Stays Unchanged

- `_allowed` / `_allowed_read` — flat arrays, PB rules, unchanged
- `Relationship` doctype — structural connections only, unchanged
- `RelationshipPanel` — not used for todos, unchanged
- `_logChanges` — fires on ToDo writes automatically, no changes needed
- `systemFields _allowed.onWrite` — ACL inheritance already works for proper children

---

## Summary

```
_allowed[]      →  who can access (ACL)
Relationship    →  how documents connect (structure)
ToDo            →  what needs to be done (action)
```

Three concerns, three mechanisms. No conflation. Clean business semantics.
The only new thing is the `ToDo` doctype schema — everything else is already built.
