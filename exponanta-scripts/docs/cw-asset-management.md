# CW Asset Management — Design Document

## Overview

Assets in CW are versioned files (HTML, CSS, JS, images) stored inside PocketBase records. Publishing is controlled by the FSM docstatus transition. When an asset is published, a side effect promotes the selected version to `pb_public/` by stripping the version suffix from the filename.

There is no git involvement. PocketBase is the version store. docstatus is the publish gate. `_changes` is the audit trail.

---

## Storage Model

### Record structure

Each asset is a PocketBase record in the `assets` collection:

```
assets/
  id:           "rec_abc123"
  name:         "bottom_cta"
  subject:      "Bottom CTA Component"
  doctype:      "Asset"
  docstatus:    0 | 1 | 2
  default_file: "bottom_cta_hvlriix0u9.html"   ← which version is selected
  files[]:      [                                ← all uploaded versions
    "bottom_cta_feaqbpi40t.html",
    "bottom_cta_hvlriix0u9.html"
  ]
  _changes:     [...]                            ← append-only audit trail
  _state:       {...}                            ← FSM state
```

### File naming convention

Uploaded files carry a PocketBase-generated random suffix before the extension:

```
{asset_name}_{random_suffix}.{ext}

bottom_cta_feaqbpi40t.html    ← version 1
bottom_cta_hvlriix0u9.html    ← version 2
banner_xk29plmq3r.jpg         ← image version 1
```

The suffix is stripped on publish to derive the canonical public filename:

```
bottom_cta_hvlriix0u9.html  →  bottom_cta.html
banner_xk29plmq3r.jpg       →  banner.jpg
```

Suffix-stripping regex:
```javascript
filename.replace(/_[a-z0-9]+(\.\w+)$/, '$1')
```

### Physical storage paths

```
pb_data/storage/{record_id}/{filename}   ← versioned files (PocketBase managed)
pb_public/{canonical_name}               ← published files (NGINX served)
```

---

## Editorial Workflow

### States

The asset lifecycle maps to docstatus dimension `0` in `_state`:

```
0  Draft      → file is being worked on, not public
1  Submitted  → published, file promoted to pb_public/
2  Cancelled  → unpublished, file removed from pb_public/
```

### Lifecycle

```
1. Create record
   → docstatus = 0 (Draft)
   → upload first file version via Filepicker
   → _changes records: op=create, files[] updated

2. Iterate
   → upload additional versions as needed
   → set default_file to the version to publish
   → _changes records each file addition and default_file change

3. Publish (docstatus 0 → 1)
   → FSM transition fires sig "0_1"
   → sideEffect runs: copies default_file → pb_public/{canonical}
   → _allowed_read gains roleispublixxxx (public read access)
   → _changes records: sig=["0_1"]

4. Unpublish / Cancel (docstatus 1 → 2)
   → FSM transition fires sig "1_2"
   → sideEffect runs: removes file from pb_public/ (or leaves stale — policy decision)
   → _allowed_read loses roleispublixxxx
   → _changes records: sig=["1_2"]

5. Rollback to different version
   → change default_file to an older version (docstatus stays 1 or reset to 0)
   → re-publish (docstatus 0 → 1 again)
   → new version promoted to pb_public/, overwriting previous
```

---

## FSM Configuration

The docstatus FSM dimension in `_state["0"]`:

```json
{
  "0": {
    "name": "_docstatus",
    "fieldname": "docstatus",
    "values": [0, 1, 2],
    "options": ["Draft", "Submitted", "Cancelled"],
    "transitions": {
      "0": [1, 2],
      "1": [2],
      "2": [0]
    },
    "labels": {
      "0_1": "Publish",
      "0_2": "Delete",
      "1_2": "Unpublish",
      "2_0": "Restore to Draft"
    },
    "confirm": {
      "0_2": "Are you sure you want to delete this asset?",
      "1_2": "This will remove the asset from public. Continue?"
    },
    "sideEffects": {
      "0_1": "asset.publish",
      "1_2": "asset.unpublish",
      "2_0": "asset.unpublish"
    }
  }
}
```

---

## Side Effects

### Option A — CW Adapter (browser-triggered, server-executed via child run)

The browser FSM fires the transition and delegates file I/O to the server via `run_doc.child()`.

```javascript
CW.Adapter.asset = {

  publish: async (run_doc) => {
    const rec = run_doc.target?.data?.[0]
    if (!rec) return

    // 1. grant public read access
    if ((CW._config.publicDoctypes || []).includes(run_doc.target_doctype)) {
      await run_doc.child({
        operation: 'update',
        target_doctype: run_doc.target_doctype,
        query: { where: { name: rec.name } },
        target: { data: [Object.assign({}, rec, { _state: {} })] },
        input: {
          _allowed_read: [
            ...(rec._allowed_read || []).filter(id => id !== 'roleispublixxxx'),
            'roleispublixxxx'
          ]
        },
        options: { render: false, internal: true }
      })
    }

    // 2. promote file to pb_public/
    if (rec.default_file) {
      const output = rec.default_file.replace(/_[a-z0-9]+(\.\w+)$/, '$1')
      await run_doc.child({
        operation: 'publish_file',
        input: {
          source: rec.default_file,
          destination: output,
          record_id: rec.id
        },
        options: { render: false, internal: true }
      })
    }
  },

  unpublish: async (run_doc) => {
    const rec = run_doc.target?.data?.[0]
    if (!rec) return

    // revoke public read access
    if ((CW._config.publicDoctypes || []).includes(run_doc.target_doctype)) {
      await run_doc.child({
        operation: 'update',
        target_doctype: run_doc.target_doctype,
        query: { where: { name: rec.name } },
        target: { data: [Object.assign({}, rec, { _state: {} })] },
        input: {
          _allowed_read: (rec._allowed_read || []).filter(id => id !== 'roleispublixxxx')
        },
        options: { render: false, internal: true }
      })
    }
    // note: pb_public/ file left in place or removed — policy decision
  }
}
```

### Option B — PocketBase JSVM hook (server-side, no child run needed)

PocketBase detects `docstatus = 1` on record save and copies the file directly.
No browser involvement in the file operation.

```javascript
// pb_hooks/assets.pb.js

onRecordAfterUpdateSuccess((e) => {
  const docstatus = e.record.get('docstatus')
  const defaultFile = e.record.get('default_file')

  if (docstatus === 1 && defaultFile) {
    const output = defaultFile.replace(/_[a-z0-9]+(\.\w+)$/, '$1')

    const fs = $app.newFilesystem()
    try {
      fs.copy(
        e.record.id + '/' + defaultFile,  // source: PB storage key
        '../pb_public/' + output           // dest: NGINX-served directory
      )
    } finally {
      fs.close()
    }
  }

  // on unpublish (docstatus = 2), optionally remove public file
  if (docstatus === 2 && defaultFile) {
    const output = defaultFile.replace(/_[a-z0-9]+(\.\w+)$/, '$1')
    try {
      $os.remove('pb_public/' + output)
    } catch (_) {
      // file may not exist, ignore
    }
  }

}, 'assets')
```

### Comparison

| | Option A (CW Adapter) | Option B (PB Hook) |
|---|---|---|
| Trigger | Browser FSM transition | PocketBase record save |
| File I/O | Server via child run | Direct in PB JSVM |
| Traceable in `_changes` | Yes (via child run op) | Requires manual logging |
| Works outside CW UI | No | Yes (API save triggers it) |
| Recommended for | CW-only workflows | Any save path |

**Recommendation:** Use Option B for file I/O (reliable, editor-agnostic) and Option A for `_allowed_read` management (needs CW run context). They are not mutually exclusive.

---

## Traceability

### `_changes` audit trail

Every step in the asset lifecycle is recorded in `_changes`:

```json
[
  {
    "op": "create",
    "at": 1779641620791,
    "by": "user0am1gxpsi72",
    "ch": [{ "field": "subject", "from": "", "to": "Bottom CTA" }]
  },
  {
    "op": "update",
    "at": 1779641680852,
    "by": "user0am1gxpsi72",
    "ch": [{ "field": "files", "from": [], "to": ["bottom_cta_feaqbpi40t.html"] }]
  },
  {
    "op": "update",
    "at": 1779641714658,
    "by": "user0am1gxpsi72",
    "ch": [{
      "field": "files",
      "from": ["bottom_cta_feaqbpi40t.html"],
      "to": ["bottom_cta_feaqbpi40t.html", "bottom_cta_hvlriix0u9.html"]
    }]
  },
  {
    "op": "update",
    "at": 1779641800000,
    "by": "user0am1gxpsi72",
    "ch": [{
      "field": "default_file",
      "from": "bottom_cta_feaqbpi40t.html",
      "to": "bottom_cta_hvlriix0u9.html"
    }]
  },
  {
    "op": "update",
    "at": 1779641874184,
    "by": "user0am1gxpsi72",
    "sig": ["0_1"]
  }
]
```

The `sig: ["0_1"]` entry is the publish event. Combined with the preceding `default_file` change, the full provenance chain is:

```
pb_public/bottom_cta.html
  ← published at 1779641874184 (sig 0_1)
    ← source: bottom_cta_hvlriix0u9.html
      ← selected as default_file at 1779641800000
        ← uploaded at 1779641714658
          ← record created at 1779641620791
```

### What git would add — nothing material

- Diff algorithm: identical to `diffLines(v1_content, v2_content)` — available via npm `diff` package
- Commit messages: replaced by `sig` FSM notation in `_changes`
- Blame / author: captured in `_changes[].by`
- History traversal: compare any two versions in `files[]` by fetching and diffing

---

## Rollback

To roll back to a previous version:

```
1. Set default_file to an older version
   → _changes records the default_file change

2. If currently published (docstatus = 1):
   → transition 1 → 2 (Unpublish)
   → transition 2 → 0 (Restore to Draft)  
   → transition 0 → 1 (Re-publish)
   → sideEffect copies old version to pb_public/, overwriting current

Or use an explicit "re-publish" transition if defined:
   → 1 → 1 re-publish (requires FSM support for self-transitions)
```

---

## Key Principles

1. **Git is not involved** — PocketBase is the version store, NGINX serves the output
2. **One canonical public path** — `pb_public/{name}.{ext}`, always suffix-free
3. **All versions retained** — `files[]` keeps every upload; nothing is deleted on publish
4. **FSM is the publish gate** — docstatus transition is the only path to production
5. **`_changes` is the audit trail** — `sig` entries record every workflow step
6. **Side effects are declarative** — JSON config names the adapter; JS implements it
7. **Binary and text assets follow identical pipeline** — no special cases
