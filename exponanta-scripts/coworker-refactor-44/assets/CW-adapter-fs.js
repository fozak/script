// ============================================================
// CW-adapter-fs.js
// Pure filesystem connector via File System Access API.
// No business logic.
// All functions: function(run_doc) — mutate only, no return.
// Reads from run_doc.target.data[0] — never from run_doc.input
//
// In-memory index: globalThis._fsIndex
//   Map<id, record>  — id = nanoid(15), stable per session
//   record._handle   — FileSystemFileHandle, kept for read/write
//   record.data.content — null until explicitly requested
//
// Supported query.where fields:
//   name, file_name, extension, path, directory,
//   size, modified, is_directory
// Supported operators: equals, contains, not, gt, gte, lt, lte, in
// Logical: AND, OR, NOT
// Raw escape hatch: query.filter (predicate fn string — eval'd)
// ============================================================

// ============================================================
// HELPERS — mirrors _mergeRecord / _buildWhereClause shape
// ============================================================

const FS_TOP = new Set(["id", "name", "doctype", "created", "updated"]);

function _mergeRecord(rec) {
  // mirrors pb _mergeRecord: flatten top-level fields into data shape
  const doc = Object.assign({}, rec.data || {});
  for (const k of FS_TOP) {
    if (k in rec) doc[k] = rec[k];
  }
  return doc;
}

function _recordFromHandle(handle, path, file) {
  // file = await handle.getFile() — called during index build
  // generateId("File", path) → e.g. "filets9zfgi" — stable readable id
  const id        = generateId("File", path);
  const name_part = handle.name;
  const dot       = name_part.lastIndexOf(".");
  const extension = dot > 0 ? name_part.slice(dot + 1).toLowerCase() : "";
  const directory = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";

  return {
    id,
    name:    id,
    doctype: "File",
    created: new Date().toISOString(),       // File API has no created date
    updated: new Date(file.lastModified).toISOString(),
    data: {
      file_name:    name_part,
      extension,
      path,                                  // full path from root, e.g. /src/index.ts
      directory,                             // parent dir, e.g. /src
      size:         file.size,               // bytes
      modified:     file.lastModified,       // ms timestamp — fast numeric comparison
      is_directory: false,
      content:      null,                    // lazy — loaded only when fields includes "content"
    },
    _handle: handle,                         // kept in memory, never serialized
  };
}

// ============================================================
// WHERE PREDICATE — in-memory equivalent of _buildWhereClause
// Operates on merged doc (flat), same field names as query.where
// ============================================================

function _matchesWhere(doc, where) {
  if (!where || typeof where !== "object") return true;

  for (const [key, value] of Object.entries(where)) {

    if (key === "OR") {
      if (!value.some(w => _matchesWhere(doc, w))) return false;
      continue;
    }
    if (key === "AND") {
      if (!value.every(w => _matchesWhere(doc, w))) return false;
      continue;
    }
    if (key === "NOT") {
      if (_matchesWhere(doc, value)) return false;
      continue;
    }

    // field is in doc directly (merged record has flat fields)
    const fieldVal = doc[key] ?? doc.data?.[key];

    if (value === null || value === undefined) {
      if (fieldVal != null) return false;
    } else if (typeof value === "string") {
      if (String(fieldVal) !== value) return false;
    } else if (typeof value === "number" || typeof value === "boolean") {
      if (fieldVal !== value) return false;
    } else if (typeof value === "object" && !Array.isArray(value)) {
      for (const [op, opValue] of Object.entries(value)) {
        switch (op) {
          case "equals":
            if (String(fieldVal) !== String(opValue)) return false;
            break;
          case "contains":
            if (!String(fieldVal ?? "").includes(String(opValue))) return false;
            break;
          case "gt":
            if (!(fieldVal > opValue)) return false;
            break;
          case "gte":
            if (!(fieldVal >= opValue)) return false;
            break;
          case "lt":
            if (!(fieldVal < opValue)) return false;
            break;
          case "lte":
            if (!(fieldVal <= opValue)) return false;
            break;
          case "not":
            if (String(fieldVal) === String(opValue)) return false;
            break;
          case "in":
            if (Array.isArray(opValue) && !opValue.includes(fieldVal)) return false;
            break;
        }
      }
    }
  }
  return true;
}

function _buildSortFn(sort) {
  if (!sort) return null;
  // sort: { modified: "desc" } or "+modified" string
  let entries;
  if (typeof sort === "string") {
    // "+field" or "-field" or "field"
    const dir = sort.startsWith("-") ? "desc" : "asc";
    const field = sort.replace(/^[+-]/, "");
    entries = [[field, dir]];
  } else {
    entries = Object.entries(sort);
  }
  return (a, b) => {
    for (const [field, dir] of entries) {
      const av = a[field] ?? a.data?.[field];
      const bv = b[field] ?? b.data?.[field];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      if (cmp !== 0) return dir === "desc" ? -cmp : cmp;
    }
    return 0;
  };
}

// ============================================================
// INDEX WALK — recursive directory traversal
// ============================================================

const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".svn", "dist", "build",
  ".next", ".nuxt", ".cache", "__pycache__", ".vscode",
]);

async function _walkDir(dirHandle, currentPath, index) {
  for await (const [name, handle] of dirHandle) {
    if (handle.kind === "directory") {
      if (IGNORE_DIRS.has(name)) continue;
      const subPath = currentPath ? `${currentPath}/${name}` : name;
      await _walkDir(handle, subPath, index);
    } else {
      const path = currentPath ? `${currentPath}/${name}` : name;
      try {
        const file = await handle.getFile();
        const rec  = _recordFromHandle(handle, path, file);
        index.set(rec.id, rec);
      } catch (e) {
        console.warn("FS: skipping unreadable file:", path, e.message);
      }
    }
  }
}

// ============================================================
// IDB HANDLE PERSISTENCE
// key: "_cw_fs_handle" — one active project per origin
// ============================================================

const IDB_DB    = "cw-fs";
const IDB_STORE = "handles";
const IDB_KEY   = "_cw_fs_handle";

function _idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess       = e => resolve(e.target.result);
    req.onerror         = e => reject(e.target.error);
  });
}

async function _idbGet(key) {
  const db = await _idbOpen();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function _idbSet(key, value) {
  const db = await _idbOpen();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, "readwrite");
    const req = tx.objectStore(IDB_STORE).put(value, key);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

// ============================================================
// INIT — IDB restore → queryPermission → or showDirectoryPicker
// Called automatically by all operations if not yet initialized
// mirrors pb: if (globalThis.pb) return
// ============================================================

async function _ensureInit(run_doc) {
  if (globalThis._fsIndex && globalThis._fsDirHandle) return true;
  await init(run_doc);
  return !run_doc.error;
}

async function init(run_doc) {
  if (globalThis._fsIndex && globalThis._fsDirHandle) {
    console.log("✅ FS adapter already initialized:", globalThis._fsRoot);
    run_doc.success = true;
    return;
  }

  let dirHandle = null;

  try {
    // 1. try to restore from IDB
    const stored = await _idbGet(IDB_KEY);

    if (stored) {
      // 2. check permission — may be silent grant or one-click
      const perm = await stored.queryPermission({ mode: "readwrite" });

      if (perm === "granted") {
        // silent restore — no user gesture needed
        dirHandle = stored;
        console.log("✅ FS: restored handle from IDB (silent):", stored.name);
      } else {
        // one-click re-grant — must be inside user gesture
        // _ensureInit is triggered by CW.run which is user-initiated
        const granted = await stored.requestPermission({ mode: "readwrite" });
        if (granted === "granted") {
          dirHandle = stored;
          console.log("✅ FS: restored handle from IDB (re-granted):", stored.name);
        }
      }
    }

    // 3. fallback — full picker if no stored handle or permission denied
    if (!dirHandle) {
      dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      await _idbSet(IDB_KEY, dirHandle);   // store for next session
      console.log("✅ FS: new handle stored to IDB:", dirHandle.name);
    }

    // 4. build index
    globalThis._fsDirHandle = dirHandle;
    globalThis._fsRoot      = dirHandle.name;
    globalThis._fsIndex     = new Map();

    console.log("🔍 FS: indexing", dirHandle.name, "...");
    await _walkDir(dirHandle, "", globalThis._fsIndex);
    console.log(`✅ FS adapter initialized: ${dirHandle.name} (${globalThis._fsIndex.size} files)`);
    run_doc.success = true;

  } catch (err) {
    if (err.name === "AbortError") {
      run_doc.error = "400 init: user cancelled directory picker";
    } else {
      run_doc.error = err.message;
    }
  }
}

// ============================================================
// SELECT — filters in-memory index, mirrors pb select
// ============================================================

async function select(run_doc) {
  if (!await _ensureInit(run_doc)) return;

  const where    = run_doc.query?.where;
  const rawFilter = run_doc.query?.filter;
  const fields   = run_doc.query?.fields;   // array of field names to include
  const perPage  = run_doc.query?.perPage;
  const page     = run_doc.query?.page || 1;
  const sortFn   = _buildSortFn(run_doc.query?.sort);

  // raw filter: optional predicate string, e.g. "doc.size > 1000 && doc.extension === 'ts'"
  let rawPredicate = null;
  if (rawFilter) {
    try {
      // eslint-disable-next-line no-new-func
      rawPredicate = new Function("doc", `return (${rawFilter})`);
    } catch (e) {
      run_doc.error = `400 select: invalid filter expression — ${e.message}`;
      return;
    }
  }

  // collect and filter
  let items = [];
  for (const rec of globalThis._fsIndex.values()) {
    const doc = _mergeRecord(rec);
    if (where && !_matchesWhere(doc, where)) continue;
    if (rawPredicate && !rawPredicate(doc))  continue;
    items.push({ rec, doc });
  }

  // sort
  if (sortFn) items.sort((a, b) => sortFn(a.doc, b.doc));

  const total = items.length;

  // paginate
  if (perPage !== undefined) {
    const start = (page - 1) * perPage;
    items = items.slice(start, start + perPage);
  }

  // load content if requested
  const needContent = Array.isArray(fields) && fields.includes("content");
  const resultDocs  = await Promise.all(items.map(async ({ rec, doc }) => {
    if (needContent && doc.content === null) {
      try {
        const file    = await rec._handle.getFile();
        doc.content   = await file.text();
        rec.data.content = doc.content; // cache in index
      } catch (e) {
        doc.content = null;
      }
    }
    // field projection — apply after content is loaded
    if (Array.isArray(fields)) {
      const projected = {};
      for (const f of fields) projected[f] = doc[f];
      return projected;
    }
    return doc;
  }));

  const pageSize   = perPage ?? total;
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 1;

  run_doc.target = {
    data: resultDocs,
    meta: {
      total,
      page,
      pageSize:   pageSize,
      totalPages,
      hasMore:    page < totalPages,
    },
  };
  run_doc.success = true;
}

// ============================================================
// CREATE — writes new file to disk, adds to index
// Reads from run_doc.target.data[0]
// Required fields: data.path (full path), data.content (string)
// ============================================================

async function create(run_doc) {
  if (!await _ensureInit(run_doc)) return;
  const doc = run_doc.target?.data?.[0];
  if (!doc) {
    run_doc.error = "400 create: no target document";
    return;
  }

  const filePath = doc.path || doc.file_name;
  if (!filePath) {
    run_doc.error = "400 create: target.data[0].path is required";
    return;
  }

  const content = doc.content ?? "";

  try {
    const handle = await _resolveHandleForWrite(filePath, true);
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();

    const file = await handle.getFile();
    const rec  = _recordFromHandle(handle, filePath, file);
    if (content) rec.data.content = content; // cache immediately
    globalThis._fsIndex.set(rec.id, rec);

    run_doc.target  = { data: [_mergeRecord(rec)], meta: { id: rec.id, name: rec.name } };
    run_doc.success = true;
  } catch (err) {
    run_doc.error = err.message;
  }
}

// ============================================================
// UPDATE — overwrites file content, updates index record
// Reads from run_doc.target.data[0]
// Required: id or name to locate record; data.content for new content
// ============================================================

async function update(run_doc) {
  if (!await _ensureInit(run_doc)) return;
  const doc = run_doc.target?.data?.[0];
  if (!doc?.id && !doc?.name) {
    run_doc.error = "400 update: no target document (need id or name)";
    return;
  }

  const id  = doc.id || doc.name;
  const rec = globalThis._fsIndex.get(id);
  if (!rec) {
    run_doc.error = `404 update: record not found — ${id}`;
    return;
  }

  try {
    // only write to disk if content explicitly provided
    if (doc.content !== undefined && doc.content !== null) {
      const content  = doc.content ?? "";
      const writable = await rec._handle.createWritable();
      await writable.write(content);
      await writable.close();
      const file        = await rec._handle.getFile();
      rec.updated       = new Date(file.lastModified).toISOString();
      rec.data.size     = file.size;
      rec.data.modified = file.lastModified;
      rec.data.content  = content;
    }

    // always update metadata fields in _fsIndex
    for (const [k, v] of Object.entries(doc)) {
      if (!['id', 'name', 'doctype', 'content'].includes(k)) {
        rec.data[k] = v;
      }
    }

    run_doc.target  = { data: [_mergeRecord(rec)], meta: { updated: 1 } };
    run_doc.success = true;
  } catch (err) {
    run_doc.error = err.message;
  }
}

// ============================================================
// DELETE — removes file from disk and index
// Soft delete not applicable for files — this is a hard delete
// ============================================================

async function del(run_doc) {
  if (!await _ensureInit(run_doc)) return;
  const doc = run_doc.target?.data?.[0];
  if (!doc?.id && !doc?.name) {
    run_doc.error = "400 delete: no target document";
    return;
  }

  const id  = doc.id || doc.name;
  const rec = globalThis._fsIndex.get(id);
  if (!rec) {
    run_doc.error = `404 delete: record not found — ${id}`;
    return;
  }

  try {
    // resolve parent directory handle to call remove()
    const dirHandle = await _resolveParentDir(rec.data.path);
    await dirHandle.removeEntry(rec.data.file_name);
    globalThis._fsIndex.delete(id);

    run_doc.target  = { data: [], meta: { deleted: 1 } };
    run_doc.success = true;
  } catch (err) {
    run_doc.error = err.message;
  }
}

// ============================================================
// REINDEX — re-walk the directory, refresh the index
// Useful after external changes outside the notebook session
// ============================================================

async function reindex(run_doc) {
  if (!await _ensureInit(run_doc)) return;
  globalThis._fsIndex = new Map();
  await _walkDir(globalThis._fsDirHandle, "", globalThis._fsIndex);
  console.log(`✅ FS reindexed: ${globalThis._fsIndex.size} files`);
  run_doc.target  = { data: [], meta: { total: globalThis._fsIndex.size } };
  run_doc.success = true;
}

// ============================================================
// INTERNAL — path resolution helpers
// ============================================================

async function _resolveParentDir(filePath) {
  const parts = filePath.split("/").filter(Boolean);
  parts.pop(); // remove filename
  let handle = globalThis._fsDirHandle;
  for (const part of parts) {
    handle = await handle.getDirectoryHandle(part, { create: false });
  }
  return handle;
}

async function _resolveHandleForWrite(filePath, create = false) {
  const parts = filePath.split("/").filter(Boolean);
  const fileName = parts.pop();
  let dirHandle = globalThis._fsDirHandle;
  for (const part of parts) {
    dirHandle = await dirHandle.getDirectoryHandle(part, { create });
  }
  return dirHandle.getFileHandle(fileName, { create });
}

// ============================================================
// SELF-REGISTER
// ============================================================

globalThis.Adapters        = globalThis.Adapters || {};
globalThis.Adapters.fs     = { init, select, create, update, delete: del, reindex };

console.log("✅ CW-adapter-fs.js loaded");
