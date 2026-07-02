# CW Role Activation Runbook

## Overview

Roles are stored as `doctype: "Role"` records in PocketBase `item` collection. They are referenced by `_allowed` and `_allowed_read` arrays on every document for RBAC enforcement via PocketBase API rules.

Two special roles are hardcoded in the system and must always exist:

| ID | role_name | Purpose |
|---|---|---|
| `roleispublixxxx` | Is Public | Grants read access to unauthenticated users. Set on `_allowed_read` when schema has `is_public: 1`. |
| `roleallxxxxxxxx` | All | Grants read access to all authenticated users. Set on `_allowed_read` when schema permissions include `role: "All"`. |

---

## Chicken-and-Egg Problem

The Role schema itself has permissions that reference roles (e.g. `System Manager`). When PocketBase is empty, those roles don't exist yet — so `CW.run` create fails with `validation_missing_rel_records` on `_allowed`/`_allowed_read`.

**Solution:** Create `System Manager` directly via PocketBase API (bypassing CW) as the bootstrap seed. Then create all remaining roles via `CW.run`.

---

## Step 1 — Delete Existing Roles (clean slate)

```js
const roles = await pb.collection('item').getFullList({ filter: 'doctype="Role"' })
for (const r of roles) {
  await pb.collection('item').delete(r.id)
}
```

---

## Step 2 — Bootstrap System Manager via PocketBase

`System Manager` must be created directly — it is the seed role that allows all subsequent `CW.run` creates to pass RBAC.

```js
const id = generateId('Role', 'System Manager')
await pb.collection('item').create({
  id,
  name: id,
  doctype: 'Role',
  docstatus: 0,
  data: {
    doctype: 'Role',
    role_name: 'System Manager',
  },
  _allowed: [],
  _allowed_read: []
})
```

---

## Step 3 — Bootstrap Special Roles via PocketBase

These two roles are referenced by the system itself and must exist before any schema-driven record creation.

```js
// Is Public — allows unauthenticated read
const pubId = generateId('Role', 'Is Public')  // = roleispublixxxx
await pb.collection('item').create({
  id: pubId,
  name: pubId,
  doctype: 'Role',
  docstatus: 1,
  data: {
    doctype: 'Role',
    role_name: 'Is Public',
    description: 'Public access role — _allowed_read for publicly visible records'
  },
  _allowed: [],
  _allowed_read: []
})

// All — allows all authenticated users to read
const allId = generateId('Role', 'All')  // = roleallxxxxxxxx
await pb.collection('item').create({
  id: allId,
  name: allId,
  doctype: 'Role',
  docstatus: 0,
  data: {
    doctype: 'Role',
    role_name: 'All',
  },
  _allowed: [],
  _allowed_read: []
})
```

---

## Step 4 — Generate All Roles from Schemas via CW

Extracts all unique role names from `CW.Schema` permissions and creates them via `CW.run`.

```js
const roleNames = new Set()
for (const schema of Object.values(CW.Schema || {})) {
  for (const perm of schema.permissions || []) {
    if (perm.role) roleNames.add(perm.role)
  }
}

console.log('Found roles:', [...roleNames])

for (const role_name of roleNames) {
  const r = await CW.run({
    operation: 'create',
    target_doctype: 'Role',
    input: { role_name }
  })
  if (r.error) console.warn('Failed:', role_name, r.error)
  else console.log('Created:', role_name, '→', r.target?.data?.[0]?.name)
}
```

> **Note:** `System Manager`, `Is Public`, and `All` will fail with `validation_not_unique` if already created in Steps 2–3. These warnings are expected and safe to ignore.

---

## Special Roles Reference

### `roleispublixxxx` — Is Public

Set automatically on `_allowed_read` at record creation when the schema has `is_public: 1`. Enforced by PocketBase API rule:

```
_allowed_read ?~ "roleispublixxxx"
```

This allows unauthenticated reads — no auth token needed.

### `roleallxxxxxxxx` — All

Set automatically on `_allowed_read` at record creation when schema `permissions` includes `{ role: "All" }`. Grants read access to all authenticated users via the `item_users` view rule.

---

## PocketBase API Rules (reference)

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

---

## Full Bootstrap Script (all steps combined)

```js
;(async () => {

  // 1. delete all existing roles
  const existing = await pb.collection('item').getFullList({ filter: 'doctype="Role"' })
  for (const r of existing) await pb.collection('item').delete(r.id)
  console.log('Deleted', existing.length, 'existing roles')

  // 2. bootstrap seed roles via PocketBase directly
  const seeds = [
    { role_name: 'System Manager', docstatus: 0 },
    { role_name: 'Is Public',      docstatus: 1 },
    { role_name: 'All',            docstatus: 0 },
  ]
  for (const s of seeds) {
    const id = generateId('Role', s.role_name)
    await pb.collection('item').create({
      id, name: id, doctype: 'Role', docstatus: s.docstatus,
      data: { doctype: 'Role', role_name: s.role_name },
      _allowed: [], _allowed_read: []
    })
    console.log('Seeded:', s.role_name, '→', id)
  }

  // 3. generate all roles from schemas via CW
  const roleNames = new Set()
  for (const schema of Object.values(CW.Schema || {})) {
    for (const perm of schema.permissions || []) {
      if (perm.role) roleNames.add(perm.role)
    }
  }
  console.log('Schema roles found:', roleNames.size)

  for (const role_name of roleNames) {
    const r = await CW.run({
      operation: 'create',
      target_doctype: 'Role',
      input: { role_name }
    })
    if (r.error) console.warn('Skip (likely exists):', role_name)
    else console.log('Created:', role_name, '→', r.target?.data?.[0]?.name)
  }

  console.log('✅ Role activation complete')

})()
```

