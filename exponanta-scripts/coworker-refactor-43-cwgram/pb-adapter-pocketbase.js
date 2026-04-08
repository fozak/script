// ============================================================
// pb-adapter-pocketbase.js
// Pure DB connector. No business logic.
// All functions: function(run_doc) — mutate only, no return.
// ============================================================

const config = {
  url: "http://143.198.29.88:8090/",
  collection: "item",
};

const PB_TOP = new Set([
  "id", "name", "doctype", "docstatus",
  "owner", "_allowed", "_allowed_read", "created", "files",
]);

function _splitRecord(doc) {
  const top  = {};
  const data = {};
  for (const [k, v] of Object.entries(doc)) {
    // PB modifier keys (files+, files-, +files) always go top-level
    if (PB_TOP.has(k) || /^[\w]+[+-]$|^[+-][\w]+$/.test(k) || v instanceof File) {
      top[k] = v;
    } else {
      data[k] = v;
    }
  }
  return { top, data };
}

function _mergeRecord(rec) {
  const doc = Object.assign({}, rec.data || {});
  for (const k of PB_TOP) {
    if (k in rec) doc[k] = rec[k];
  }
  return doc;
}

function _getFieldPath(fieldName) {
  if (PB_TOP.has(fieldName)) return fieldName;
  return `data.${fieldName}`;
}

function _buildWhereClause(where) {
  if (!where || typeof where !== "object") return "";
  const parts = [];

  for (const [key, value] of Object.entries(where)) {
    if (key === "OR") {
      const p = value.map(_buildWhereClause).filter(Boolean);
      if (p.length) parts.push(`(${p.join(" || ")})`);
      continue;
    }
    if (key === "AND") {
      const p = value.map(_buildWhereClause).filter(Boolean);
      if (p.length) parts.push(`(${p.join(" && ")})`);
      continue;
    }
    if (key === "NOT") {
      const p = _buildWhereClause(value);
      if (p) parts.push(`!(${p})`);
      continue;
    }

    const field = _getFieldPath(key);

    if (value === null || value === undefined) {
      parts.push(`${field} = null`);
    } else if (typeof value === "string") {
      parts.push(`${field} = "${value}"`);
    } else if (typeof value === "number" || typeof value === "boolean") {
      parts.push(`${field} = ${value}`);
    } else if (typeof value === "object" && !Array.isArray(value)) {
      for (const [op, opValue] of Object.entries(value)) {
        switch (op) {
          case "equals":   parts.push(`${field} = "${opValue}"`); break;
          case "contains": parts.push(`${field} ~ "${opValue}"`); break;
          case "gt":       parts.push(`${field} > ${opValue}`); break;
          case "gte":      parts.push(`${field} >= ${opValue}`); break;
          case "lt":       parts.push(`${field} < ${opValue}`); break;
          case "lte":      parts.push(`${field} <= ${opValue}`); break;
          case "not":      parts.push(`${field} != "${opValue}"`); break;
          case "in":
            if (Array.isArray(opValue) && opValue.length)
              parts.push(`(${opValue.map(v => `${field} = "${v}"`).join(" || ")})`);
            break;
        }
      }
    }
  }
  return parts.join(" && ");
}

function _buildFilter(run_doc) {
  const doctype = run_doc.target_doctype ?? run_doc.source_doctype;
  const parts   = [];
  if (doctype) parts.push(`doctype = "${doctype}"`);
  const where = run_doc.query?.where;
  if (where) {
    const clause = _buildWhereClause(where);
    if (clause) parts.push(`(${clause})`);
  }
  return parts.join(" && ") || undefined;
}

function _buildSort(run_doc) {
  const sort = run_doc.query?.sort;
  if (!sort) return undefined;
  if (typeof sort === "string") return sort;
  return Object.entries(sort)
    .map(([f, dir]) => `${dir === "desc" ? "-" : "+"}${_getFieldPath(f)}`)
    .join(",");
}

// ============================================================
// INIT
// ============================================================

async function init(run_doc) {
  if (globalThis.pb) return;
  globalThis.pb = new PocketBase(config.url);
  globalThis.pb.autoCancellation(false);
  console.log("✅ PocketBase initialized:", config.url);
}

// ============================================================
// SELECT
// ============================================================

async function select(run_doc) {
  const doctype = run_doc.target_doctype ?? run_doc.source_doctype;
  if (!doctype) { run_doc.error = "400 select: missing doctype"; return; }

  let items, meta;

  // fast path: single record by name
  // use getFullList with filter — works for both old (id≠name) and new (id=name) records
  // getOne(name) would 404 for old records since getOne requires PB id not name field
  const where      = run_doc.query?.where || {};
  const whereKeys  = Object.keys(where);
  const singleName = whereKeys.length === 1 && whereKeys[0] === 'name' && typeof where.name === 'string'
    ? where.name : null;

  if (singleName && !run_doc.query?.take) {
    const filter = `doctype = "${doctype}" && (name = "${singleName}")`;
    items = await globalThis.pb.collection(config.collection).getFullList({ filter });
    meta  = { total: items.length, page: 1, pageSize: items.length, totalPages: 1, hasMore: false };
  } else {
    const params = {};
    const filter = _buildFilter(run_doc);
    if (filter) params.filter = filter;
    const sort = _buildSort(run_doc);
    if (sort) params.sort = sort;
    if (run_doc.query?.fields) params.fields = run_doc.query.fields;

    const take = run_doc.query?.take;
    const skip = run_doc.query?.skip;

    if (take !== undefined) {
      const page   = skip ? Math.floor(skip / take) + 1 : 1;
      const result = await globalThis.pb.collection(config.collection).getList(page, take, params);
      items = result.items;
      meta  = {
        total:      result.totalItems,
        page:       result.page,
        pageSize:   result.perPage,
        totalPages: result.totalPages,
        hasMore:    result.page < result.totalPages,
      };
    } else {
      items = await globalThis.pb.collection(config.collection).getFullList(params);
      meta  = { total: items.length, page: 1, pageSize: items.length, totalPages: 1, hasMore: false };
    }
  }

  run_doc.target  = { data: items.map(_mergeRecord).filter(Boolean), meta };
  run_doc.success = true;
}

// ============================================================
// CREATE
// ============================================================

async function create(run_doc) {
  const doc           = run_doc.input;
  const { top, data } = _splitRecord(doc);

  try {
    const created = await globalThis.pb.collection(config.collection)
      .create({ id: doc.name, ...top, data });
    run_doc.target  = { data: [_mergeRecord(created)], meta: { id: created.id, name: created.name } };
    run_doc.success = true;
  } catch(err) {
    console.error("PB create error:", JSON.stringify(err.response?.data || err.message));
    run_doc.error = err.message;
  }
}

// ============================================================
// UPDATE
// always receives a fresh target from CW-run _handlers.update re-fetch
// target.data[0] has the full PB record including correct id
// use rec.id for PATCH — works for both old (id≠name) and new (id=name) records
// ============================================================

async function update(run_doc) {
  const filter = _buildFilter(run_doc);
  if (!filter) { run_doc.error = "400 update: missing query.where or doctype"; return; }

  try {
    const existing = await globalThis.pb.collection(config.collection).getFullList({ filter });

    if (!existing.length) {
      run_doc.target  = { data: [], meta: { updated: 0 } };
      run_doc.success = true;
      return;
    }

    const { top, data } = _splitRecord(run_doc.input);

    const updated = await Promise.all(existing.map(async rec => {
      const mergedData = Object.assign({}, rec.data, data);
      await globalThis.pb.collection(config.collection).update(rec.id, { ...top, data: mergedData });
      const recTop = {};
      for (const k of PB_TOP) { if (rec[k] !== undefined) recTop[k] = rec[k]; }
      return Object.assign({}, recTop, mergedData, top);
    }));

    run_doc.target  = { data: updated, meta: { updated: updated.length } };
    run_doc.success = true;
  } catch(err) {
    console.error("PB update error:", JSON.stringify(err.response?.data || err.message));
    run_doc.error = err.message;
  }
}

// ============================================================
// DELETE (soft — docstatus = 2)
// ============================================================

async function del(run_doc) {
  run_doc.input.docstatus = 2;
  await update(run_doc);
}

// ============================================================
// SELF-REGISTER
// ============================================================

globalThis.Adapter            = globalThis.Adapter || {};
globalThis.Adapter.pocketbase = { config, init, select, create, update, delete: del };

console.log("✅ pb-adapter-pocketbase.js loaded");
