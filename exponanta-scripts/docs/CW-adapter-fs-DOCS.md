
Implemented:

IDB handle persistence — store on first pick, restore on reload
queryPermission on restore — silent if granted, one-click if prompt
Auto-init on first CW.run — no explicit init needed
Hard reload stays silent — session permission survives Ctrl+Shift+R
Clean reset via IDB key delete — next run triggers picker

Not yet done:

Multi-project — one IDB key per project, project switcher UI
.cw/config.json in project root — project identity portable across browsers/machines
Explicit "Change folder" button in notebook UI
queryPermission === "denied" graceful fallback with user message
Permission revocation handling — if user revokes in Chrome settings mid-session
Firefox fallback — File System Access API unsupported, no fallback path yet
Project list UI — "recently opened" from IDB keys
You said: do handle sees the parent dir like for the above pb_public/assets or just assetsdo handle sees the parent dir like for the above pb_public/assets or just assets5:29 PMClaude responded: Just assets.Just assets.
The handle only sees what the user picked — the directory they selected in the picker. The handle has no knowledge of parent directories above it. handle.name returns "assets", not "pb_public/assets" or any absolute path.
This is a deliberate security constraint of the File System Access API — the browser never exposes the full filesystem path to the web app. The app gets a capability-bound handle to exactly what the user granted, nothing above it.
So if you pick assets, you can read/write inside assets freely, but you cannot traverse up to pb_public or anywhere else. The root is fixed at the picked directory.Sonnet 4.6 Low



# CW Filesystem Adapter — Implementation Document

## What Was Built

A browser-based filesystem adapter (`CW-adapter-fs.js`) that plugs into the CW framework alongside the existing PocketBase adapter. It uses the File System Access API to read and write real files on disk, with a full in-memory index for fast querying — no server, no Node.js, no WebSocket.

All operations follow the existing CW contract: `function(run_doc)`, mutate only, no return. Reads from `run_doc.target.data[0]`, writes results back to `run_doc.target`. Identical shape to `pb-adapter-pocketbase.js`.

---

## Files Changed or Created

| File | Change |
|---|---|
| `CW-adapter-fs.js` | New — full fs adapter |
| `CW-config.js` | Added `doctypeAdapters`, `fs` registry entry |
| `CW-run.js` | 5 line changes — adapter routing |
| `db.json` | Added `File` schema record |
| `index.js` | Import `CW-adapter-fs.js` |

---

## How Adapter Routing Works

### The Config

```javascript
// CW-config.js
adapters: {
  defaults: {
    db: "pocketbase",
    auth: "auth",
  },

  // doctype → adapter mapping
  // any target_doctype in this map bypasses the default db adapter
  doctypeAdapters: {
    File: "fs",
    // GitCommit: "git",   ← future
    // GitBranch: "git",   ← future
  },

  registry: {
    pocketbase: {
      type: "db",
      logChanges: 1,       // _logChanges runs for this adapter
      ...
    },
    fs: {
      type: "fs",
      name: "FileSystem",
      logChanges: 0,       // _logChanges skipped for this adapter
    }
  }
}
```

### The Resolver — `CW._resolveAll` (CW-run.js)

```javascript
const adapterType     = opConfig.adapterType || 'db';
const doctypeOverride = cfg.adapters?.doctypeAdapters?.[op.target_doctype];
op.adapter            = doctypeOverride
  || cfg.adapters?.defaults?.[adapterType]
  || cfg.adapters?.defaults?.db;
```

Priority order:
1. Explicit `adapterType` in the run call — always wins
2. `doctypeAdapters` mapping — `File` → `fs`
3. `defaults.db` — fallback for everything else

`op.adapter` is then copied to `run_doc.adapter` in the run factory and flows through the entire lifecycle.

### The Dispatch — `CW._handlers` (CW-run.js)

All four handlers now use `run_doc.adapter` instead of hardcoded `defaults.db`:

```javascript
// was
const db = CW._config.adapters.defaults.db;
await globalThis.Adapter[db].select(run_doc);

// now
await globalThis.Adapter[run_doc.adapter].select(run_doc);
```

This means `CW.run({ target_doctype: "File", ... })` automatically routes to `globalThis.Adapter.fs` with zero additional logic anywhere.

---

## The `_config` Flags That Control Behavior

### `doctypeAdapters` — adapter selection per doctype

```javascript
doctypeAdapters: { File: "fs" }
```

The single flag that makes everything work. Any `target_doctype: "File"` run resolves `adapter: "fs"` automatically. No explicit `adapterType` needed in run calls.

### `registry[adapter].logChanges` — controls `_logChanges`

```javascript
fs: { logChanges: 0 }
```

`_logChanges` tries to fetch the existing record from PocketBase to diff changes. For fs adapter records this would 404 since File records never live in PocketBase. The guard at the top of `_logChanges`:

```javascript
if (
  run_doc.options?._logging === false ||
  !CW._config.systemSettings?.logChanges ||
  CW._config.adapters.registry?.[run_doc.adapter]?.logChanges === 0
) return
```

Setting `logChanges: 0` in the registry entry skips change logging for that adapter entirely. This pattern extends to any future capability flag — `logThreads`, `permissions`, `versioning` etc.

### `schema._autosave` — controls whether controller auto-saves

```javascript
// File schema in db.json
{ "_autosave": 1 }   // ← must be 1 (or absent)
```

`_autosave: 0` would cause the controller to skip the create/update handler entirely — the file would never be written. Since `File` records never reach PocketBase anyway (the adapter switch happens before any handler runs), `_autosave: 0` is unnecessary and harmful. Leave it at 1.

### `schema.fields[].virtual` — controls `_stripVirtual`

```javascript
// content field — do NOT mark virtual
{ "fieldname": "content", "fieldtype": "Code" }
```

`virtual: 1` causes `_stripVirtual` to remove the field from `target.data[0]` before the adapter write. For PocketBase fields this makes sense — virtual fields aren't columns. For fs files, `content` IS the data being written. Marking it virtual causes empty files. Do not mark `content` as virtual.

---

## The In-Memory Index

```javascript
globalThis._fsIndex     // Map<id, record> — stable per session
globalThis._fsDirHandle // FileSystemDirectoryHandle — root of picked directory
globalThis._fsRoot      // string — name of root directory
```

### Record Shape

Every record in `_fsIndex` mirrors the PocketBase item shape exactly:

```javascript
{
  id:      "fileindexts9zfgi",   // generateId("File", filename)
  name:    "fileindexts9zfgi",   // same as id — CW convention
  doctype: "File",
  created: "2026-01-01T...",     // session time — File API has no created date
  updated: "2026-01-01T...",     // from file.lastModified
  data: {
    file_name:    "index.ts",
    extension:    "ts",          // no dot, lowercase
    path:         "src/index.ts", // relative to root, no leading slash
    directory:    "src",
    size:         1024,          // bytes
    modified:     1704067200000, // ms timestamp — fast numeric comparison
    is_directory: false,
    content:      null,          // lazy — null until fields includes "content"
  },
  _handle: FileSystemFileHandle, // kept in memory, never serialized, used for reads/writes
}
```

`_handle` is the key — it stays open for the session so reads and writes never re-request permissions. The browser grants access once at `init` time and the handles remain valid for the page lifetime.

### What the File API Provides

The browser `File System Access API` gives very little per file:

| Property | Source | Notes |
|---|---|---|
| `name` | `handle.name` | Filename only, no path |
| `size` | `file.size` | Bytes |
| `lastModified` | `file.lastModified` | Unix ms timestamp |
| `type` | `file.type` | MIME — unreliable for code files |

Everything else — `path`, `directory`, `extension` — is constructed during the index walk. There is no native `path` from the API; it is built by concatenating directory names as the walk descends.

### Auto-Init Pattern

The adapter mirrors PocketBase's `if (globalThis.pb) return` pattern. Every operation auto-initializes on first call:

```javascript
async function _ensureInit(run_doc) {
  if (globalThis._fsIndex && globalThis._fsDirHandle) return true;
  await init(run_doc);
  return !run_doc.error;
}
```

First `CW.run` with `target_doctype: "File"` triggers `showDirectoryPicker`. Subsequent calls hit the guard and return immediately. No explicit init call needed in application code.

### Ignored Directories

```javascript
const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".svn", "dist", "build",
  ".next", ".nuxt", ".cache", "__pycache__", ".vscode",
]);
```

Skipped during the index walk. A 10k file project stays fast because `node_modules` is never indexed.

---

## The File Schema (`db.json`)

Stored as a normal `Schema` record in PocketBase alongside all other schemas. Compiled by `_compileSchemas` at boot exactly like `Task`, `Event` etc.

```json
{
  "schema_name": "File",
  "doctype": "Schema",
  "title_field": "file_name",
  "is_public": 0,
  "fields": [
    { "fieldname": "file_name",    "fieldtype": "Data",     "in_list_view": 1, "read_only": 1 },
    { "fieldname": "extension",    "fieldtype": "Data",     "in_list_view": 1, "read_only": 1 },
    { "fieldname": "path",         "fieldtype": "Data",     "in_list_view": 1, "read_only": 1 },
    { "fieldname": "directory",    "fieldtype": "Data",     "in_list_view": 0, "read_only": 1 },
    { "fieldname": "size",         "fieldtype": "Int",      "in_list_view": 0, "read_only": 1 },
    { "fieldname": "modified",     "fieldtype": "Datetime", "in_list_view": 1, "read_only": 1 },
    { "fieldname": "is_directory", "fieldtype": "Check",    "in_list_view": 0, "read_only": 1 },
    { "fieldname": "content",      "fieldtype": "Code",     "in_list_view": 0, "options": "JavaScript" }
  ]
}
```

The schema drives `in_list_view` field projection in `_handlers.select` — a select without explicit `fields` returns only `file_name`, `extension`, `path`, `modified` and `name` (from systemFields). Content is never returned unless `fields: ["content"]` is explicitly requested.

### Why Schema Lives in PocketBase Not Config

The schema is metadata about the shape of File records — not data. PocketBase already holds all other schemas. Consistency matters more than the philosophical separation. The constraint is: File **data records** must never be stored in PocketBase (`globalThis["File"]` would clobber the native browser `File` constructor). The **schema record** is safe because `_compileSchemas` writes to `globalThis.CW.Schema`, not `globalThis[doctype]`.

---

## Query Language

The fs adapter uses the identical `run_doc.query` shape as the PocketBase adapter. The same `where`, `sort`, `perPage`, `page`, `fields` keys work unchanged.

```javascript
// all ts files sorted by modified date
CW.run({
  target_doctype: "File",
  query: {
    where: { extension: "ts" },
    sort: { modified: "desc" },
    perPage: 20
  }
})

// files in src/ larger than 1kb
CW.run({
  target_doctype: "File",
  query: {
    where: {
      AND: [
        { path: { contains: "src/" } },
        { size: { gt: 1000 } }
      ]
    }
  }
})

// read content of a specific file
CW.run({
  target_doctype: "File",
  query: {
    where: { file_name: "index.ts" },
    fields: ["file_name", "content"]
  }
})
```

The PocketBase adapter translates `where` to a PocketBase filter string. The fs adapter translates the same `where` to an in-memory predicate function. Same input, different translation, same output shape.

### Supported `where` Operators

| Operator | Example | Notes |
|---|---|---|
| string equality | `{ extension: "ts" }` | exact match |
| `equals` | `{ extension: { equals: "ts" } }` | same as above |
| `contains` | `{ path: { contains: "src/" } }` | substring |
| `not` | `{ extension: { not: "js" } }` | inequality |
| `gt/gte/lt/lte` | `{ size: { gt: 1000 } }` | numeric comparison |
| `in` | `{ extension: { in: ["ts","tsx"] } }` | array membership |
| `OR` | `{ OR: [{...},{...}] }` | any match |
| `AND` | `{ AND: [{...},{...}] }` | all match |
| `NOT` | `{ NOT: { extension: "js" } }` | negate |
| `filter` | `{ filter: "doc.size > 1000" }` | raw JS predicate string — escape hatch |

---

## CRUD Operations

### select
Filters `_fsIndex` in memory. Content is lazy — `null` by default, loaded only when `fields` includes `"content"`. All other metadata is available immediately from the index with no disk reads.

### create
Reads `path` and `content` from `target.data[0]`. Resolves the directory tree from `_fsDirHandle`, creates the file, writes content, adds record to `_fsIndex`. Path is relative to the root directory picked at init.

### update
Pre-fetches via select if `target.data[0].name` is missing (controller handles this). Finds record in `_fsIndex` by id, overwrites file via stored `_handle`, refreshes metadata from disk.

### delete
Hard delete — removes file from disk and from `_fsIndex`. No soft delete (no `docstatus: 2` pattern) — files don't have lifecycle states.

### reindex
Re-walks the directory from scratch. Only needed when files change externally (outside the notebook session). For files written through the adapter, `_fsIndex` stays in sync automatically.

---

## Memory Profile

For a typical project:

| Files | Index size | Notes |
|---|---|---|
| 1,000 | ~2MB | metadata only, no content |
| 10,000 | ~20MB | still well within browser limits |
| 1,000 + content loaded | ~7MB | depends on average file size |

V8 uses the same hidden class for all records (identical shape) — best case for memory efficiency. String keys are interned. `_handle` objects are the largest per-record cost at ~300 bytes each.

---

## Constraints and Known Limitations

**Chrome/Edge only** — `showDirectoryPicker` is not supported in Firefox. ~70% of browser market covered.

**Session-scoped** — `_fsIndex` and all handles are lost on page reload. `init` must be called again (triggers directory picker once per session).

**No `created` date** — the File System Access API does not expose file creation time. `created` in the record is the session time when the file was first indexed, not the actual filesystem creation date.

**Path convention** — paths are relative to the picked root, no leading slash: `src/index.ts` not `/src/index.ts`. AI-generated queries must follow this convention.

**`doctype: "File"` reserved** — File records must never be stored in PocketBase. The doctype name collides with the native browser `File` constructor. A guard in `_compileDocument` should be added to prevent accidental compilation of File records.

---

## Usage Examples

```javascript
// select all js files
CW.run({ target_doctype: "File", query: { where: { extension: "js" } } })

// create a new file
CW.run({
  target_doctype: "File",
  operation: "create",
  input: { path: "src/new-file.ts", content: "export const x = 1" }
})

// update file content (no separate select needed)
CW.run({
  target_doctype: "File",
  operation: "update",
  query: { where: { file_name: "new-file.ts" } },
  input: { content: "export const x = 2" }
})

// read file content
CW.run({
  target_doctype: "File",
  query: { where: { file_name: "new-file.ts" }, fields: ["file_name", "content"] }
})
```
