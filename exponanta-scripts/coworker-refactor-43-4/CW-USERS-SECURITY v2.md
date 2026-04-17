# CW Users & Security

Documents the user model, PocketBase security rules, provisioning flow,
and role management. Status as of April 15, 2026.

---

## Overview

Security in CW is built on two layers:

1. **PocketBase API rules** — enforced at the database level on every request
2. **CW RBAC** — `_allowed` and `_allowed_read` arrays on every `item` record

PocketBase rules are the hard security boundary. CW RBAC is the business access
control layer. Both must pass for any operation to succeed.

---

## Two PocketBase Collections

### `users` collection (PocketBase auth)

Standard PocketBase auth collection. Handles authentication only:
- email, password, verified flag
- JWT token issuance
- Email verification flow

### `item` collection (all CW documents)

Single collection storing every CW document regardless of doctype.
Top-level fields: `id`, `name`, `doctype`, `docstatus`, `owner`,
`_allowed`, `_allowed_read`, `created`, `files`, `data` (JSON).

All security rules operate on this collection.

---

## Two Constant Roles

Two role IDs are hardcoded throughout the system:

```javascript
const SYSTEM_MANAGER_ROLE_ID = 'rolesystemmanag'  // in auth.js
const IS_PUBLIC_ROLE_ID      = 'roleispublixxxx'  // in CW-config.js
```

These are Role records in the `item` collection with `doctype=Role` and
`docstatus=1`. They are never created dynamically — they are seeded in `db.json`
and must exist before the system operates.

| Role ID | Purpose |
|---|---|
| `rolesystemmanag` | Full system access — can read/write any document |
| `roleispublixxxx` | Public read access — unauthenticated users can read documents with this role in `_allowed_read` |

---

## PocketBase API Rules

### `item` collection — View rule

Controls who can read any record:

```
_allowed_read ?~ "roleispublixxxx"
||
(
  @request.auth.id != "" && (
    id = @request.auth.id ||
    owner = @request.auth.id ||
    _allowed ?~ @request.auth.id ||
    _allowed_read ?~ @request.auth.id ||
    (
      @collection.item_users.id ?= @request.auth.id &&
      _allowed ?~ @collection.item_users.role_id
    ) ||
    (
      @collection.item_users.id ?= @request.auth.id &&
      _allowed_read ?~ @collection.item_users.role_id
    )
  )
)
```

**What this means in plain English:**

A record is readable if ANY of these are true:
1. `roleispublixxxx` is in `_allowed_read` — public document, anyone can read
2. Requester is authenticated AND:
   - Their user ID matches the record ID (reading own User record)
   - They are the owner
   - Their user ID is in `_allowed` (write access implies read)
   - Their user ID is in `_allowed_read`
   - They have a role via `item_users` view that is in `_allowed`
   - They have a role via `item_users` view that is in `_allowed_read`

### `item` collection — Create rule

```
doctype != "User" || (
  @request.auth.id != "" &&
  @request.body.id = @request.auth.id &&
  @request.body._allowed_read:length = 0 &&
  @request.body._allowed:length = 1 &&
  @request.body._allowed:each ~ "rolesystemmanag" &&
  @request.body.owner = ""
)
```

**What this means:**

Any authenticated user can create any non-User document. For `doctype=User`
specifically, strict constraints apply:
- Must be authenticated
- `id` must equal `@request.auth.id` (can only create own User record)
- `_allowed_read` must be empty (no read access granted at creation)
- `_allowed` must contain exactly one entry: `rolesystemmanag`
- `owner` must be empty string

This prevents a malicious user from creating a User record with
`rolesystemmanag` in `_allowed_read` — which would grant themselves
system manager access. The rule enforces that new User records start
with only system manager in `_allowed`, and no read access at all.

### `item` collection — Update rule

```
@request.auth.id != "" &&
(@request.body.doctype:isset = false || @request.body.doctype = doctype) &&
(
  owner = @request.auth.id ||
  _allowed ?~ @request.auth.id ||
  (
    @collection.item_users.id ?= @request.auth.id &&
    _allowed ?~ @collection.item_users.role_id
  )
)
```

**What this means:**

Authenticated user can update a record if:
- They are the owner, OR
- Their user ID is in `_allowed`, OR
- They have a role via `item_users` that is in `_allowed`

Doctype cannot be changed on update — prevents record type hijacking.

---

## `item_users` View

PocketBase view collection that resolves role membership for any user:

```sql
SELECT u.id, j.value AS role_id
FROM item u, json_each(u._allowed_read) j
WHERE u.doctype = 'User'
```

This joins each User record's `_allowed_read` array (which contains role IDs)
into individual rows. PocketBase API rules reference it via
`@collection.item_users` to check if a requesting user has a role that
grants access to a document.

**Example:** User has `roleeventattten` in their `_allowed_read`.
An Event has `roleeventattten` in its `_allowed_read`.
The `item_users` view resolves this join — user can read the Event.

---

## User Provisioning

Handled in `auth.js` using direct PocketBase SDK calls — not via CW `run_doc`.
This is intentional: provisioning requires PocketBase-specific operations
(auth record creation, email verification) that have no CW abstraction.

### Two-step creation (security reason)

User provisioning creates two separate records in a specific order:

**Step 1 — Create PocketBase auth record**
```javascript
await pb.collection('users').create({
  id, email, password, passwordConfirm, name, emailVisibility: true
})
```

**Step 2 — Login immediately**
```javascript
await pb.collection('users').authWithPassword(email, password)
```

Login is required before creating the `item` record because the Create rule
requires `@request.auth.id != ""`. Without this, the item create would fail.

**Step 3 — Create User item record**
```javascript
await pb.collection('item').create({
  id:            userId,
  name:          userId,
  doctype:       'User',
  docstatus:     0,
  owner:         '',           // User records never have personal ownership
  _allowed:      ['rolesystemmanag'],  // only system can manage
  _allowed_read: [],           // private by default
  data:          { ... }
})
```

The Create rule enforces: `_allowed` must contain exactly `rolesystemmanag`,
`_allowed_read` must be empty, `owner` must be `""`. This prevents
self-assignment of privileged roles at creation time.

**Step 4 — Create UserPublicProfile item record**
```javascript
await pb.collection('item').create({
  id:            profileId,    // generateId('UserPublicProfile', userId)
  doctype:       'UserPublicProfile',
  owner:         userId,       // user owns their own profile
  _allowed:      [userId],     // user can edit own profile
  _allowed_read: ['roleispublixxxx'],  // everyone can read public profile
  data:          { full_name: name, ... }
})
```

**Step 5 — Send verification email**
```javascript
await pb.collection('users').requestVerification(email)
```

### Why two records per user

| Record | Purpose | Who controls |
|---|---|---|
| `pb.users` auth record | Authentication only — email, password, verified | PocketBase |
| `item` doctype=User | CW identity — role membership via `_allowed_read` | System Manager |
| `item` doctype=UserPublicProfile | Public profile — name, avatar, bio | User themselves |

The separation is intentional:
- Auth is PocketBase's concern — CW never touches passwords
- Role assignment is system manager's concern — lives on the private User item record
- Public presentation is the user's concern — lives on UserPublicProfile

---

## Role Management

### Role records

Roles are `item` records with `doctype=Role`. Role IDs are deterministic:

```javascript
generateId('Role', 'Event Attendee')  // → 'roleeventattten' (15 chars)
generateId('Role', 'Partner')         // → 'rolepartnerxxxx'
```

Roles are seeded in `db.json` and never created at runtime by regular users.

### Role assignment via RelationshipPanel

System manager assigns roles to users via the `RelationshipPanel` on the
User document form. The flow:

```
System Manager opens User record
  → RelationshipPanel shows (User schema has Relationship Panel field)
  → Type dropdown: "Has Role"  (from relationshipTypes.User.Role)
  → Search dropdown: pick role record e.g. "Event Attendee"
  → Click + Add → creates Relationship (docstatus=0)
  → Click Accept → Relationship 0→1
  → sideEffect fires:
      access = relationshipAccessMap.User.Role["Has Role"] = "read"
      patches User._allowed_read += generateId('Role', 'Event Attendee')
```

The role ID is now in `User._allowed_read`. The `item_users` view resolves
this at query time — any document with `roleeventattten` in `_allowed_read`
is now readable by this user.

### Config declaration

```javascript
// CW-config.js

relationshipTypes: {
  "User": {
    "Role": ["Has Role"],
    "User": ["Editor", "Delegate", "Assistant"],
  },
  "Event": {
    "User": ["Attendee", "Speaker", "Volunteer", "Organizer", "Sponsor Contact"],
    ...
  },
}

relationshipAccessMap: {
  "User": {
    "Role": {
      "Has Role": "read",   // role ID → User._allowed_read
    },
    "User": {
      "Editor":    "write", // userId → User._allowed
      "Delegate":  "write",
      "Assistant": "read",  // userId → User._allowed_read
    },
  },
  "Event": {
    "User": {
      "Organizer": "write", // userId → Event._allowed
      "Attendee":  "read",  // userId → Event._allowed_read
      ...
    },
  },
}
```

### How role-based document access works end-to-end

```
1. System Manager assigns "Has Role: Event Attendee" to userA
   → userA._allowed_read = ['roleeventattten']

2. New Event created with default_allowed_read in schema
   → Event._allowed_read = ['roleeventattten', 'roleispublixxxx']

3. userA requests Event list
   → PocketBase View rule checks item_users view
   → finds userA has roleeventattten
   → Event._allowed_read contains roleeventattten
   → access granted
```

---

## Security Notes

- `rolesystemmanag` cannot be self-assigned — Create rule blocks it at DB level
- `roleispublixxxx` makes documents publicly readable without authentication
- `_allowed` grants write access — implies read access via View rule
- `_allowed_read` grants read-only access
- Role IDs in `User._allowed_read` = role badges the user holds
- User IDs in document `_allowed`/`_allowed_read` = individual grants
- Both coexist in the same array — PocketBase evaluates either
- `item_users` view is the join mechanism — without it role-based access would require client-side resolution

---

## ACL Propagation via Relationship SideEffects

`_allowed` and `_allowed_read` on documents are never patched manually.
All ACL changes flow through the Relationship FSM — when a Relationship
transitions between states, the sideEffect patches the parent document's
access arrays automatically.

This means:
- Granting access = accepting a Relationship (`0→1`)
- Revoking access = cancelling a Relationship (`1→2`)
- Restoring access = reopening a Relationship (`2→0`)

Access control is a consequence of business workflow, not a separate
configuration step.

---

## The Three SideEffects

### Why FSM drives ACL

The Relationship doctype has three FSM transitions that affect ACL:

| Transition | Label | ACL action |
|---|---|---|
| `0→1` | Accept | Add `related_name` to parent `_allowed` or `_allowed_read` |
| `1→2` | Cancel | Remove `related_name` from parent `_allowed` or `_allowed_read` |
| `2→0` | Reopen | Re-add `related_name` to parent `_allowed` or `_allowed_read` |

The `access` level (`write` vs `read` vs `none`) is looked up from
`CW._config.relationshipAccessMap[parenttype][related_doctype][type]`.
If `none` or the mapping does not exist, the sideEffect exits without
patching anything — the Relationship is a business-only connection with
no system access effect.

### Critical implementation notes

- All three sideEffects use `run_doc.child()` — never naked `CW.run()`
- `run_doc.child()` is awaited — previous versions omitted `await` causing silent failures
- The update child run sets `options: { internal: true }` — bypasses the docstatus editable check so system can patch `_allowed` on submitted parent documents
- The `related_doctype !== 'User'` guard was removed — sideEffects now work for any `related_doctype` including `Role`

### `0→1` Accept — add to `_allowed` or `_allowed_read`

```javascript
async function(run_doc) {
  var rec = run_doc.target && run_doc.target.data && run_doc.target.data[0];
  if (!rec) return;

  // look up access level from config
  var access = (
    CW._config.relationshipAccessMap &&
    CW._config.relationshipAccessMap[rec.parenttype] &&
    CW._config.relationshipAccessMap[rec.parenttype][rec.related_doctype] &&
    CW._config.relationshipAccessMap[rec.parenttype][rec.related_doctype][rec.type]
  ) || 'none';

  // none = business relationship only, no ACL effect
  if (access === 'none' || !rec.related_name || !rec.parent) return;

  // fetch parent document
  var selRun = await run_doc.child({
    operation: 'select', target_doctype: rec.parenttype,
    query: { where: { name: rec.parent } }, options: { render: false }
  });
  var pDoc = selRun.target && selRun.target.data && selRun.target.data[0];
  if (!pDoc) return;

  var field = access === 'write' ? '_allowed' : '_allowed_read';
  var cur = pDoc[field] || [];
  if (cur.includes(rec.related_name)) return;  // already has access — skip

  // patch parent — internal:true bypasses docstatus editable check
  var updateRun = await run_doc.child({
    operation: 'update', target_doctype: rec.parenttype,
    query: { where: { name: rec.parent } },
    options: { render: false, internal: true }
  });
  updateRun.target = { data: [pDoc] };
  if (access === 'write') {
    updateRun.input._allowed = cur.concat([rec.related_name]);
  } else {
    updateRun.input._allowed_read = (pDoc._allowed_read || []).concat([rec.related_name]);
  }
  await CW.controller(updateRun);
}
```

### `1→2` Cancel — remove from `_allowed` or `_allowed_read`

```javascript
async function(run_doc) {
  var rec = run_doc.target && run_doc.target.data && run_doc.target.data[0];
  if (!rec) return;

  var access = (
    CW._config.relationshipAccessMap &&
    CW._config.relationshipAccessMap[rec.parenttype] &&
    CW._config.relationshipAccessMap[rec.parenttype][rec.related_doctype] &&
    CW._config.relationshipAccessMap[rec.parenttype][rec.related_doctype][rec.type]
  ) || 'none';

  if (access === 'none' || !rec.related_name || !rec.parent) return;

  var selRun = await run_doc.child({
    operation: 'select', target_doctype: rec.parenttype,
    query: { where: { name: rec.parent } }, options: { render: false }
  });
  var pDoc = selRun.target && selRun.target.data && selRun.target.data[0];
  if (!pDoc) return;

  var field = access === 'write' ? '_allowed' : '_allowed_read';

  var updateRun = await run_doc.child({
    operation: 'update', target_doctype: rec.parenttype,
    query: { where: { name: rec.parent } },
    options: { render: false, internal: true }
  });
  updateRun.target = { data: [pDoc] };
  if (access === 'write') {
    updateRun.input._allowed = (pDoc._allowed || []).filter(function(id) {
      return id !== rec.related_name;
    });
  } else {
    updateRun.input._allowed_read = (pDoc._allowed_read || []).filter(function(id) {
      return id !== rec.related_name;
    });
  }
  await CW.controller(updateRun);
}
```

### `2→0` Reopen — re-add to `_allowed` or `_allowed_read`

```javascript
async function(run_doc) {
  var rec = run_doc.target && run_doc.target.data && run_doc.target.data[0];
  if (!rec) return;

  var access = (
    CW._config.relationshipAccessMap &&
    CW._config.relationshipAccessMap[rec.parenttype] &&
    CW._config.relationshipAccessMap[rec.parenttype][rec.related_doctype] &&
    CW._config.relationshipAccessMap[rec.parenttype][rec.related_doctype][rec.type]
  ) || 'none';

  if (access === 'none' || !rec.related_name || !rec.parent) return;

  var selRun = await run_doc.child({
    operation: 'select', target_doctype: rec.parenttype,
    query: { where: { name: rec.parent } }, options: { render: false }
  });
  var pDoc = selRun.target && selRun.target.data && selRun.target.data[0];
  if (!pDoc) return;

  var field = access === 'write' ? '_allowed' : '_allowed_read';
  var cur = pDoc[field] || [];
  if (cur.includes(rec.related_name)) return;  // already restored — skip

  var updateRun = await run_doc.child({
    operation: 'update', target_doctype: rec.parenttype,
    query: { where: { name: rec.parent } },
    options: { render: false, internal: true }
  });
  updateRun.target = { data: [pDoc] };
  if (access === 'write') {
    updateRun.input._allowed = cur.concat([rec.related_name]);
  } else {
    updateRun.input._allowed_read = (pDoc._allowed_read || []).concat([rec.related_name]);
  }
  await CW.controller(updateRun);
}
```

---

## Verified Behavior (IIEE tested April 15, 2026)

| Test | Result |
|---|---|
| Organizer `0→1` → hostId in `Event._allowed` | ✅ |
| Attendee `0→1` → guestId in `Event._allowed_read` | ✅ |
| Organizer `1→2` → hostId removed from `Event._allowed` | ✅ |
| Organizer `2→0` → hostId re-added to `Event._allowed` | ✅ |
| Attendee `1→2` → guestId removed from `Event._allowed_read` | ✅ |
| Has Role `0→1` → roleId in `User._allowed_read` | ✅ |
| Editor `0→1` → userId in `User._allowed` | ✅ |
