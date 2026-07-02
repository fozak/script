# CW User Provisioning & ID Generation

## User Record Architecture

Four distinct records per user, each serving a different concern:

| Doctype | Collection | Owner | Purpose |
|---------|-----------|-------|---------|
| `@users` | PocketBase auth | PocketBase | Authentication — email, password, token |
| `User` | `item` | `""` (none) | Authorization — roles, permissions, admin-managed |
| `UserSettings` | `item` | userId | Preferences — self-service, private |
| `UserPublicProfile` | `item` | userId | Identity — public-facing, world-readable |

---

## ID Generation

### Core principle

All user-related doctypes use **deterministic IDs derived from email** via `hashEmail()`. Same email always produces the same ID suffix across all four doctypes. This guarantees:

- No duplicates — PocketBase rejects duplicate IDs
- Traceable — IDs visually link across doctypes
- No separate unique index needed

### EMAIL_KEYED prefixes

```javascript
const EMAIL_KEYED = {
  'User':              'user',  // user + 11 chars = userc96l7xxxxxx
  'UserPublicProfile': 'usep',  // usep + 11 chars = usepc96l7xxxxxx
  'UserSettings':      'uses',  // uses + 11 chars = usesc96l7xxxxxx
}
```

Same email → same 11-char hash suffix → different 4-char prefix per doctype:

```
email: denis@test.com
User:              user062c67oyuz0
UserPublicProfile: usep062c67oyuz0
UserSettings:      uses062c67oyuz0
```

### hashEmail

Two-state multiply-xor hash. Single pass O(n). No repetition in output:

```javascript
function hashEmail(email) {
  let h1 = 0, h2 = 0x9747b28c
  for (let i = 0; i < email.length; i++) {
    const c = email.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x9e3779b9)
    h2 = Math.imul(h2 ^ c, 0x85ebca77)
  }
  h1 ^= h2 >>> 13
  h2 ^= h1 >>> 11
  const combined = (Math.abs(h1) * 1000000 + Math.abs(h2)) % Number.MAX_SAFE_INTEGER
  return Math.abs(combined).toString(36).padStart(11, '0').substring(0, 11)
}
```

### generateId dispatch

```javascript
function generateId(doctype, title = null) {
  // EMAIL_KEYED — deterministic from email
  if (EMAIL_KEYED[doctype]) {
    if (!title?.trim()) throw new Error(`${doctype} requires an email address`)
    return (EMAIL_KEYED[doctype] + hashEmail(title)).substring(0, 15)
  }
  // SINGLE_DOCTYPES — deterministic from title (Role, Country, etc.)
  return SINGLE_DOCTYPES.has(doctype)
    ? generateSingleId(doctype, title)
    : generateMultiId(doctype, title)
}
```

---

## autoname in Schema

`autoname` tells systemFields `onCreate` which field to use as the title for `generateId`.

### Convention

```json
"autoname": "field:email"
```

Means: `generateId(doctype, doc['email'])` — use `doc.email` as the title.

### Required on all EMAIL_KEYED doctypes

| Doctype | autoname |
|---------|----------|
| `User` | not needed — handled by special case in `generateId` |
| `UserPublicProfile` | `"field:email"` ← required |
| `UserSettings` | `"field:email"` ← required |

Without `autoname: "field:email"`, systemFields `onCreate` calls `generateId(doctype)` with no title → throws `"UserPublicProfile requires an email address"`.

### How it works at create time

```
input.email → _mergeInput → doc.email (in target.data[0])
→ systemFields onCreate
→ autoname = "field:email" → doc[a.slice(6)] = doc["email"]
→ generateId('UserPublicProfile', doc.email)
→ deterministic ID set on doc.name
→ persisted to PocketBase
```

`email` is a transient field — only present during `_preflight`. After create it can be stored as a proper data field on the record if needed.

---

## Provisioning Flow

### Single entry point

All registration goes through one `CW.run` call:

```javascript
await CW.run({
  operation:      'create',
  target_doctype: 'UserPublicProfile',
  input:          {
    email:     'user@example.com',
    password:  'password123',
    full_name: 'Full Name',
    _state:    { '1.0_1': '' }   // ← triggers signUp FSM signal
  },
  options: { render: false }
})
```

### Full chain

```
CW.run create UserPublicProfile + _state: { '1.0_1': '' }
  → FSM dim 1, signal 0_1 fires
  → Adapter.pocketbase.signUp(run_doc)
      → authRegister(email, password, full_name)
          → provisionUser(email, password, full_name)
              → Step 1: pb.users.create()        ← @users auth record
              → Step 2: pb.users.authWithPassword()  ← login
              → Step 3: pb.item.create(User)     ← User item
              → Step 3A: pb.item.create(UserSettings) ← UserSettings
              → Step 4: requestVerification()
      → _setUser(run_doc)                        ← session set
  → CW _handlers.create
      → _preflight → systemFields onCreate
          → autoname: "field:email" → generateId → usep + hash
      → pb.item.create(UserPublicProfile)        ← UserPublicProfile
```

### What creates what

| Record | Created by | Why |
|--------|-----------|-----|
| `@users` | `provisionUser` raw PB call | Must exist before login |
| `User item` | `provisionUser` raw PB call | Needs `owner: ""`, special RBAC |
| `UserSettings` | `provisionUser` raw PB call | Needs `owner: userId` set at login time |
| `UserPublicProfile` | CW `_handlers.create` | Target doctype of the CW.run call |

### Why UserPublicProfile is NOT in provisionUser

`provisionUser` is called inside a FSM sideEffect. If `provisionUser` also created `UserPublicProfile`, CW `_handlers.create` would create a second one after the sideEffect — duplicate record.

Separation of concerns:
- `provisionUser` = auth concern (raw PB, pre-login records)
- CW `_handlers.create` = document concern (post-login, goes through full pipeline)

### _allowed / _allowed_read at create

| Record | `_allowed` | `_allowed_read` |
|--------|-----------|----------------|
| `User item` | `[rolesystemmanag]` | `[]` |
| `UserSettings` | `[userId]` | `[]` |
| `UserPublicProfile` | set by systemFields from schema permissions | `[roleispublixxxx]` if `is_public: true` |

---

## Duplicate Protection

Three layers:

1. **Deterministic ID** — same email always generates same ID
2. **PocketBase unique ID** — rejects duplicate `id` on create
3. **`provisionUser` try/catch** — returns `null` on 400, no partial state

```javascript
async function provisionUser(email, password, name) {
  try {
    // ... all steps
  } catch (err) {
    if (err?.status === 400) {
      console.warn('⚠️ User already exists:', email)
      return null
    }
    throw err
  }
}
```

Second registration attempt fails at Step 1 (duplicate email in `@users`) before any `item` records are touched.

---

## FSM Schema for UserPublicProfile

Dim `1` handles the signup lifecycle:

```json
"1": {
  "values": [0, 1, 2],
  "options": ["Draft", "SignedUp", "Saved"],
  "transitions": {
    "0": [1],
    "1": [2],
    "2": [2]
  },
  "labels": {
    "0_1": "Sign Up",
    "1_2": "Save",
    "2_2": "Save"
  },
  "sideEffects": {
    "0_1": "Adapter.pocketbase.signUp"
  }
}
```

Signal `1.0_1` → triggers `signUp` → full provisioning chain.
Signal `1.1_2` → saves profile after signup (no sideEffect, standard update).
