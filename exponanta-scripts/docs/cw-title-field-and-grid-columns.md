# CW title_field Stabilization & Grid Column Architecture

**Date:** May 2026  
**Status:** Partially implemented — see deferred items

---

## What Was Done

### 1. Schema Pattern — `title_field` is mandatory in CW

Every schema must declare `title_field`. This is **opposite to Frappe** where many schemas omit it because Frappe's `name` is human-readable. In CW, `name` is always a generated hash (`rolesystemmanag`, `hash123abc`) so `title_field` is required everywhere for display.

**Universal schema pattern:**
```json
{
  "schema_name": "Role",
  "title_field": "role_name",
  "fields": [
    {
      "fieldname": "name",
      "fieldtype": "Data",
      "label": "Name",
      "in_list_view": 1,
      "read_only": 1,
      "hidden": 0,
      "reqd": 0
    },
    {
      "fieldname": "role_name",
      "fieldtype": "Data",
      "label": "Role Name",
      "in_list_view": 1,
      "reqd": 1
    }
  ],
  "field_order": ["name", "role_name", ...]
}
```

**Rules:**
- `name` field always added to `fields[]` — `read_only:1`, `hidden:0`, `reqd:0`
- `name` always first in `field_order`
- `in_list_view:1` on `name` field when `title_field === "name"`, otherwise `0` is cleaner (both work for now)
- `title_field` field must have `in_list_view:1`

---

### 2. `title_field` Behaviour Patterns (from live schema query)

| Pattern | Meaning | Action |
|---|---|---|
| `USER_MUST_FILL` | `title_field` is `reqd:1` | Form validation + `_preflight` blocks save. Nothing extra needed. |
| `AUTONAME_IS_TITLE` | `autoname: field:x` and `title_field: x` are same field | Name generation and display use same field. No fallback needed. |
| `SILENT_FALLBACK` | `title_field` not `reqd`, not autoname source | `_preflight` must populate on create (see below). |
| `TITLE_FIELD_MISSING_FROM_FIELDS` | `title_field` points to non-existent field | Schema bug — fix manually. |
| `NO_TITLE_FIELD` | No `title_field` declared | Schema bug — all fixed by patch scripts. |

---

### 3. `SILENT_FALLBACK` — `_preflight` onCreate logic

**Not yet implemented.** Required for these doctypes:

| Doctype | `title_field` | Fallback source |
|---|---|---|
| Sales Invoice | `customer_name` | `name` (e.g. `INV-2026-00001`) |
| Payment Entry | `title` | `name` |
| Item | `item_name` | autoname source `item_code` |
| User | `full_name` | `first_name + last_name` → `email` → `name` |
| DocShare | `name` | already system field, no action |
| Notification | `type` | `name` |
| Workflow Action | `reference_name` | `name` |
| + others with `autoname: —` | `name` | `name` |

**Proposed `_preflight` logic (not implemented):**
```javascript
const tf = schema?.title_field;
if (tf && !run_doc.input[tf]) {
  const tfField = schema.fields?.find(f => f.fieldname === tf);
  if (!tfField?.reqd) {
    // User special case — concat name
    if (run_doc.target_doctype === 'User') {
      const { first_name, last_name, email } = run_doc.input;
      run_doc.input[tf] = [first_name, last_name].filter(Boolean).join(' ')
                          || email
                          || run_doc.input.name;
    } else {
      // generic — autoname source field or name
      const autonameSrc = schema.autoname?.startsWith('field:')
        ? schema.autoname.slice(6) : null;
      run_doc.input[tf] = (autonameSrc && run_doc.input[autonameSrc])
                          || run_doc.input.name;
    }
  }
}
```

---

### 4. Grid Column Architecture

#### Current implementation

**List view** columns are built from `schema.fields.filter(f => f.in_list_view)`.  
`title_field` is always prepended as column 1, deduplicated if already in `in_list_view` set:

```javascript
const titleField = schema.title_field;
const titleFieldDef = schema.fields.find(f => f.fieldname === titleField)
  || { fieldname: titleField, label: 'Name' };

const listColumns = [
  { fieldname: titleField, label: titleFieldDef?.label || titleField },
  ...schema.fields
    .filter(f => f.in_list_view && f.fieldname !== titleField)
    .map(f => ({ fieldname: f.fieldname, label: f.label }))
];
```

**Card view** — `title_field` is always the card heading, `in_list_view` fields are the card body rows. Same source, different rendering.

#### `in_list_view` role

`in_list_view` is a **default column visibility hint only** — not a fetch filter.  
Fetch always returns full `data{}` blob from PocketBase (no field-level filtering).  
This keeps the architecture open for column customization without changing the fetch layer.

#### Fetch layer — adapter flattening

The PocketBase adapter (`pb-adapter-pocketbase.js`) already implements two-way flattening:

- **`_mergeRecord` (on fetch)** — merges top-level PB fields (`name`, `owner`, `_state`, `_allowed` etc.) into `data{}` so renderer always reads `record.data.*` only
- **`_splitRecord` (on write)** — splits `data{}` back into top-level columns + blob before PB write

`PB_TOP` set defines which fields are top-level: `id, name, doctype, docstatus, owner, _allowed, _allowed_read, created, files`.

All CW code above the adapter reads only `record.data.*` — no special cases for top-level fields.

---

### 5. Column Customization — NOT IMPLEMENTED

**Reason: UI missing.** No column picker, no save/load UI for user preferences.

**Proposed architecture (for future implementation):**

```
Schema fields[]          →  source of truth for what EXISTS
in_list_view             →  default column visibility hint
Fetch                    →  always data.* (full blob)
UserPublicProfile        →  stores per-user column prefs per doctype
CW._userPrefs cache      →  loaded at boot from UserPublicProfile, zero extra calls at grid time
Grid column resolver     →  resolveColumns(schema, CW._userPrefs) at render time
```

**`resolveColumns` (not implemented):**
```javascript
function resolveColumns(schema, userPrefs) {
  const saved = userPrefs?.list_columns?.[schema.schema_name];
  if (saved) return saved;  // user's saved column set

  // default
  const defaults = schema.fields
    .filter(f => f.in_list_view)
    .map(f => f.fieldname);
  return [...new Set([schema.title_field, ...defaults])];
}
```

**Storage decision:** column prefs stored in `UserPublicProfile.list_settings` JSON blob.  
Two calls on grid load are avoided by caching prefs in `CW._userPrefs` at boot — parallel fetch with records if cache is cold.

**Not implemented because:**
- No column picker UI built
- No save/load interaction designed
- `applyColumnPrefs` call would sit between select handler and render — handler stays unchanged
- Clean separation already established: handler owns fetch, renderer owns columns

---

### 6. Scripts Used

| Script | Purpose |
|---|---|
| `patch-schemas.js` | Pass 1 — patched 29 schemas that already had `title_field`: added `name` field to `fields[]` and `field_order` |
| `patch-schemas-2.js` | Pass 2 — patched 28 skipped schemas: set `title_field` for `TITLE_IS_NAME` and `TITLE_FIELD_MAP` groups |
| `patch-schemas-3.js` | Pass 3 — fixed `name` field properties: `reqd:0`, `read_only:1`, `hidden:0`, `in_list_view:1` |

---

### 7. Remaining Manual Fixes

| Doctype | Issue | Fix |
|---|---|---|
| `AvailabilityRule` | `title_field: owner` — `owner` is system field, not in `fields[]` | Change to `title_field: "name"` |
| `TaskNew` | `title_field: subject` — `subject` not in `fields[]` | Add `subject` field to schema or fix `title_field` |

---

### 8. Boot-time Warning (proposed, not implemented)

```javascript
// in _buildIndex, after loading schemas
if (!schema.title_field) {
  console.warn(`[CW] Schema "${name}" missing title_field`);
}
```

Surfaces schema authoring mistakes immediately on load rather than silent blank headings in grid.
