POTENTIAL TODO 

Found the key discussion. From that chat the agreed pattern was:
schema.permissions carries FSM transition access per role:
json"permissions": [
  { "role": "Projects User",   "1.0_1": 1 },
  { "role": "Projects Manager", "1.1_2": 1, "1.1_3": 1 }
]
_handleSignal checks run_doc.user roles against permissions:
Before firing any transition — check if the user's roles include a permission entry that allows this signal. If not → _failSignal('Not authorized').
_getTransitions filters by user role for UI:
Already partially implemented — labelOverrides reads permissions.transitions for display. The missing part is actually filtering out transitions the user's role can't fire — not just relabeling them.
So the full picture:

_allowed — PocketBase gate: can this user touch the document at all
permissions[role].signal — pipeline gate: can this user fire this specific signal
docstatus + allow_on_submit — field gate: can this user change this field

Three independent layers. Role-based FSM gating closes the gap between flat _allowed and role-aware transitions.You said: this is the best way of intersecting roles and FSM (in schema), but is this difficultthis is the best way of intersecting roles and FSM (in schema), but is this difficult1:19 PMClaude responded: No.No. Looking at your current _getTransitions:
javascriptconst currentUserId = CW._config?.currentUser?.id || "";
const isSelf = !!(currentUserId && (doc.name === currentUserId || doc.owner === currentUserId));
const labelOverrides = {};
for (const p of schema.permissions || []) {
  if (p.role === "Self" && !isSelf) continue;
  for (const [signal, label] of Object.entries(p.transitions || {})) {
    if (signal.startsWith(dim + ".")) labelOverrides[signal] = label;
  }
}
It already iterates schema.permissions and checks Self. The only missing piece is filtering by user's actual roles.
The change is minimal — build a set of allowed signals for the current user's roles, then filter transitions against it:
javascriptconst userRoles = new Set(run_doc.user?._allowed_read || []);
const allowedSignals = new Set();

for (const p of schema.permissions || []) {
  if (p.role === 'Self' && !isSelf) continue;
  if (p.role !== 'Self' && !userRoles.has(p.role)) continue;
  for (const key of Object.keys(p)) {
    if (key.includes('.')) allowedSignals.add(key); // signal keys contain '.'
  }
}
Then in the .map() — if allowedSignals.size > 0 and signal not in allowedSignals → return null.
If allowedSignals is empty (no role-based permissions defined) — all transitions allowed as before. Backward compatible.
Same check in _handleSignal for server-side enforcement.


OPEN ISSUE

do i make user rather _allowed. then every user from _allowed can change _state and then any other field, how then we protect in docstatus:1 NOT to change fields while keeping _state updatable

12:53 PM
Claude responded: From prior discussions — the key pattern is:

Relevant chats
Relevant chats
From prior discussions — the key pattern is:

_allowed controls who can write to the document. But _state must always be writable by anyone in _allowed regardless of docstatus.

The resolution from that earlier discussion:

_state is exempt from docstatus field protection because FSM transitions ARE the mechanism that changes docstatus. Blocking _state writes when docstatus = 1 would make it impossible to Cancel or Amend — which requires firing a signal that transitions docstatus from 1 → 2.

So the rule is:

docstatus = 0  → all fields writable (for users in _allowed)
docstatus = 1  → only _state writable + fields with allow_on_submit: 1
docstatus = 2  → only _state writable (for amend signal)
In CW.controller — before _mergeInput:

javascript
if (doc.docstatus > 0 && schema?.is_submittable) {
  for (const [k] of Object.entries(run_doc.input)) {
    if (k === '_state') continue;  // always allowed
    const field = schema.fields?.find(f => f.fieldname === k);
    if (!field?.allow_on_submit) delete run_doc.input[k];  // strip protected fields
  }
}
_state is never stripped. All other fields stripped unless allow_on_submit: 1. Users in _allowed can always fire FSM signals — field data changes are gated by docstatus.

You said: so its on controller level.
so its on controller level. but then user can directly do pb update(

12:54 PM
Claude responded: Yes.
Yes. PocketBase direct update bypasses CW.controller entirely — no _state protection, no allow_on_submit check, no RBAC.

The fix is PocketBase rules — server-side, not client-side. In PocketBase collection rules for item:

Update rule:

@request.auth.id != "" &&
(owner = @request.auth.id || _allowed:each ?= @request.auth.id)
But this only checks who can update — not which fields.

PocketBase doesn't have per-field rules. So the real protection is:

_state always writable — no PocketBase restriction needed, FSM signals are the intended path
Data fields at docstatus > 0 — PocketBase can't enforce allow_on_submit per field
The honest answer: client-side CW.controller is the only place allow_on_submit can be enforced in your current architecture. Direct PocketBase access bypasses it.

For production security — either:

Add a server-side hook in PocketBase that checks docstatus + allow_on_submit via a custom JS hook
Or accept that CW.controller is the trust boundary and direct PB access requires admin credentials
This is the same tradeoff Frappe makes — server enforces RBAC, but direct DB access bypasses everything.

You said: my controller using pb calls, so i can not limit it
my controller using pb calls, so i can not limit it

12:56 PM
Claude responded: Yes.
Yes. Your controller IS the PocketBase client — it calls pb.collection('item').update() directly. You can't add a PocketBase rule that blocks your own controller calls without blocking legitimate FSM transitions too.

The architectural options:

Option 1 — PocketBase JS hooks (server-side) PocketBase supports onRecordBeforeUpdateRequest hooks in JS. Hook checks docstatus + which fields changed + allow_on_submit. Fires before any update including your controller. This is the real server-side enforcement.

Option 2 — Separate _state from data in PocketBase Two collections — item for data fields, item_state for _state only. Different PocketBase rules per collection. item locked at docstatus > 0. item_state always writable. Your controller writes to the right collection based on what's changing.

Option 3 — Accept controller as trust boundary Direct PB access = admin only. All user-facing operations go through CW.controller. Security model: API key + PocketBase rules restrict direct access to admin credentials only.

Option 1 is cleanest — server enforces without architecture changes. Option 3 is pragmatic for your current stage. Option 2 is overengineering.

What's your deployment model — is PocketBase accessible directly by end users or only through your app?









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



ACL Roles — Where They Live
Role IDs
RoleIDMeaningroleispublixxxxhardcodedEveryone including unauthenticatedroleallxxxxxxxxhardcodedAll authenticated usersrolesystemmanaggeneratedSystem Managerroleprojecuserxgenerated via generateId('Role', 'Projects User')Any named role

Where set in Schema
schema.is_public: 1 → roleispublixxxx added to _allowed_read on create:
json{ "schema_name": "UserPublicProfile", "is_public": 1 }
schema.permissions → roles iterated on create → write roles to _allowed, read-only roles to _allowed_read:
json"permissions": [
  { "role": "Projects User", "write": 1, "create": 1 },
  { "role": "Projects Manager", "read": 1 }
]
roleallxxxxxxxx → set via schema.permissions with role: "All":
json{ "role": "All", "read": 1 }
generateId('Role', 'All') = roleallxxxxxxxx

Where set in Code — CW._config.systemFields
systemFields._allowed.onCreate
  ← iterates schema.permissions write/create roles → generateId → _allowed
  ← adds doc.owner → _allowed

systemFields._allowed_read.onCreate
  ← iterates schema.permissions read-only roles → generateId → _allowed_read
  ← schema.is_public → pushes 'roleispublixxxx' → _allowed_read

PB Filter Rule
_allowed_read ?~ "roleispublixxxx"     ← public, no auth needed
|| (
  @request.auth.id != "" && (
    id = @request.auth.id              ← own record
    || owner = @request.auth.id        ← owner
    || _allowed ?~ @request.auth.id    ← explicit user write access
    || _allowed_read ?~ @request.auth.id  ← explicit user read access
    || _allowed ?~ item_users.role_id  ← role write access
    || _allowed_read ?~ item_users.role_id  ← role read access
  )
)

Flow Summary
Schema definition
  is_public: 1          → roleispublixxxx → _allowed_read
  permissions[].role    → generateId()    → _allowed (write)
                                          → _allowed_read (read-only)
  role: 'All'           → roleallxxxxxxxx → _allowed_read

onCreate (CW._config.systemFields)
  _allowed.onCreate     → roles + owner
  _allowed_read.onCreate → roles + is_public flag

PB record saved
  _allowed: ['roleprojecuserx', 'ownerUserId']
  _allowed_read: ['roleispublixxxx', 'roleallxxxxxxxx']

PB filter rule
  enforces at query time

{
  name: '_allowed', fetch: true,
  onWrite: (run_doc) => {
    const doc    = run_doc.target?.data?.[0];
    if (!doc) return;
    const schema     = CW.Schema?.[run_doc.target_doctype];
    const linkFields = (schema?.fields || []).filter(f => f.fieldtype === 'Link');
    const hasParent  = !!(doc.parent && doc.parenttype);
    const hasLinks   = linkFields.some(f => doc[f.fieldname]);
    if (!hasParent && !hasLinks && run_doc.operation !== 'create') return;

    const roles = (schema?.permissions || [])
      .filter(p => p.role && (p.write === 1 || p.create === 1))
      .map(p => generateId('Role', p.role));
    if (doc.owner) roles.push(doc.owner);

    if (hasParent) {
      const parentRun = CW.runs[run_doc.parent_run_id];
      const p = parentRun?.target?.data?.[0];
      if (p?._allowed) roles.push(...p._allowed);
    }

    for (const f of linkFields) {
      const linked = Object.values(CW.runs).find(r =>
        r.target_doctype === f.options &&
        r.target?.data?.[0]?.name === doc[f.fieldname]
      )?.target?.data?.[0];
      if (linked?._allowed) roles.push(...linked._allowed);
    }

    doc._allowed = [...new Set([...(doc._allowed || []), ...roles])];

    // Relationship → patch related document _allowed
    if (run_doc.target_doctype === 'Relationship' && doc.related_name && doc.related_doctype) {
      const parentRun = CW.runs[run_doc.parent_run_id];
      const parentDoc = parentRun?.target?.data?.[0];
      if (parentDoc) {
      run_doc.child({
          operation:      'update',
          target_doctype: doc.related_doctype,
          query:          { where: { name: doc.related_name } },
          input:          { _allowed: [...new Set([...(parentDoc._allowed || [])])] },
          options:        { render: false, internal: true },
        });
      }
    }
  },
},
{
  name: '_allowed_read', fetch: true,
  onWrite: (run_doc) => {
    const doc    = run_doc.target?.data?.[0];
    if (!doc) return;
    const schema     = CW.Schema?.[run_doc.target_doctype];
    const linkFields = (schema?.fields || []).filter(f => f.fieldtype === 'Link');
    const hasParent  = !!(doc.parent && doc.parenttype);
    const hasLinks   = linkFields.some(f => doc[f.fieldname]);
    if (!hasParent && !hasLinks && run_doc.operation !== 'create') return;

    const roles = (schema?.permissions || [])
      .filter(p => p.role && p.read === 1 && !(p.write === 1 || p.create === 1))
      .map(p => generateId('Role', p.role));
    if (schema?.is_public && !roles.includes('roleispublixxxx'))
      roles.push('roleispublixxxx');

    if (hasParent) {
      const parentRun = CW.runs[run_doc.parent_run_id];
      const p = parentRun?.target?.data?.[0];
      if (p?._allowed_read) roles.push(...p._allowed_read);
    }

    for (const f of linkFields) {
      const linked = Object.values(CW.runs).find(r =>
        r.target_doctype === f.options &&
        r.target?.data?.[0]?.name === doc[f.fieldname]
      )?.target?.data?.[0];
      if (linked?._allowed_read) roles.push(...linked._allowed_read);
    }

    doc._allowed_read = [...new Set([...(doc._allowed_read || []), ...roles])];

    // Relationship → patch related document _allowed_read
    if (run_doc.target_doctype === 'Relationship' && doc.related_name && doc.related_doctype) {
      const parentRun = CW.runs[run_doc.parent_run_id];
      const parentDoc = parentRun?.target?.data?.[0];
      if (parentDoc) {
        run_doc.child({
          operation:      'update',
          target_doctype: doc.related_doctype,
          query:          { where: { name: doc.related_name } },
          input:          { _allowed_read: [...new Set([...(parentDoc._allowed_read || [])])] },
          options:        { render: false, internal: true },
        });
      }
    }
  },
},




  //--inheritance

ACL Propagation — Document & Code Reference
Overview
_allowed and _allowed_read on every document are computed from four sources, merged at write time. All managed in CW._config.systemFields._allowed.onWrite and ._allowed_read.onWrite.

Sources of ACL
SourceTriggerDirectionSchema permissionsevery create/update with referenceschema → docownerevery createcurrent user → docparent/parenttypedoc has parent field setparent → childLink fielddoc has Link field with valuelinked doc → current docRelationship createRelationship doctype createdparent → related docis_public: 1every create/update with referenceschema flag → roleispublixxxx

By fieldtype
Schema permissions — all doctypes on create:
schema.permissions[].role (write/create) → generateId → _allowed
schema.permissions[].role (read only)    → generateId → _allowed_read
schema.is_public                         → roleispublixxxx → _allowed_read
owner — all doctypes on create:
doc.owner → _allowed
Table children — child records with parent/parenttype:
parent doc._allowed      → child._allowed      (via parent_run_id)
parent doc._allowed_read → child._allowed_read  (via parent_run_id)
Link fields — when linked doc is in CW.runs:
linked doc._allowed      → current doc._allowed
linked doc._allowed_read → current doc._allowed_read
Relationship doctype — two propagations on create:

Relationship inherits parent ACL via parent/parenttype (same as Table child)
Related document (related_name/related_doctype) gets parent ACL patched in via fire-and-forget child update


Guard — when onWrite fires
jsconst hasParent = !!(doc.parent && doc.parenttype);
const hasLinks  = linkFields.some(f => doc[f.fieldname]);
if (!hasParent && !hasLinks && run_doc.operation !== 'create') return;
Fires on:

create — always
update — only when parent/parenttype or any Link field is set on doc

Skips:

Pure field updates (subject, description, etc.) with no reference fields
FSM signal updates
_allowed/_allowed_read patches to unrelated documents


Where in code
CW._config.systemFields — two handlers:
_allowed.onWrite     → schema write roles + owner + parent + Link + Relationship patch
_allowed_read.onWrite → schema read roles + is_public + parent + Link + Relationship patch
CW.runs[parent_run_id] — parent ACL read from run tree, not from PB. Guarantees the latest in-memory ACL is used.
Object.values(CW.runs).find() — Link field and Relationship related doc lookup. Only works if linked doc was loaded in the same session — by design, since UI always loads linked docs before referencing them.

What is NOT propagated automatically

Cascade on ACL change — if parent's _allowed changes after children exist, existing children are not updated. Only new creates/updates inherit the new ACL.
Relationship cancel/revoke — removing related_name from parent ACL on Relationship FSM 1→2 Cancel is handled by existing Relationship sideEffects (separate mechanism, not yet refactored from old pattern).
Dynamic Link — treated same as Link but options is determined at runtime from another field — currently not resolved in onWrite.