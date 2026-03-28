// ============================================================
// pb-adapter-pocketbase.js
// Pure DB connector. No business logic. No schema knowledge.
// All functions: function(run_doc) — mutate only, no return.
// ============================================================

const config = {
  url: "http://143.198.29.88:8090/",
  collection: "item",
};

// ============================================================
// TOP-LEVEL POCKETBASE FIELDS (outside data blob)
// ============================================================

const PB_TOP = new Set([
  "id", "name", "doctype", "docstatus",
  "owner", "_allowed", "_allowed_read", "created",
]);

// ============================================================
// PRIVATE HELPERS
// ============================================================

function _splitRecord(doc) {
  const top  = {};
  const data = {};
  for (const [k, v] of Object.entries(doc)) {
    if (PB_TOP.has(k)) top[k] = v;
    else data[k] = v;
  }
  return { top, data };
}

function _mergeRecord(rec) {
  const doc = rec.data || {};
  for (const k of PB_TOP) {
    if (k in rec) doc[k] = rec[k];
  }
  return doc;
}

// ============================================================
// QUERY BUILDER (PocketBase filter syntax)
// ============================================================

function _getFieldPath(fieldName) {
  if (PB_TOP.has(fieldName)) return fieldName;
  return `data.${fieldName}`;
}

function _buildWhereClause(where) {
  if (!where || typeof where !== "object") return "";
  const parts = [];

  for (const [key, value] of Object.entries(where)) {
    if (key === "OR") {
      const orParts = value.map(_buildWhereClause).filter(Boolean);
      if (orParts.length) parts.push(`(${orParts.join(" || ")})`);
      continue;
    }
    if (key === "AND") {
      const andParts = value.map(_buildWhereClause).filter(Boolean);
      if (andParts.length) parts.push(`(${andParts.join(" && ")})`);
      continue;
    }
    if (key === "NOT") {
      const notClause = _buildWhereClause(value);
      if (notClause) parts.push(`!(${notClause})`);
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
          case "equals":    parts.push(`${field} = "${opValue}"`); break;
          case "contains":  parts.push(`${field} ~ "${opValue}"`); break;
          case "gt":        parts.push(`${field} > ${opValue}`); break;
          case "gte":       parts.push(`${field} >= ${opValue}`); break;
          case "lt":        parts.push(`${field} < ${opValue}`); break;
          case "lte":       parts.push(`${field} <= ${opValue}`); break;
          case "not":       parts.push(`${field} != "${opValue}"`); break;
          case "in":
            if (Array.isArray(opValue) && opValue.length) {
              parts.push(`(${opValue.map(v => `${field} = "${v}"`).join(" || ")})`);
            }
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
    .map(([field, dir]) => `${dir === "desc" ? "-" : "+"}${_getFieldPath(field)}`)
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

  const params = {};
  const filter = _buildFilter(run_doc);
  if (filter) params.filter = filter;

  const sort = _buildSort(run_doc);
  if (sort) params.sort = sort;

  if (run_doc.query?.fields)  params.fields  = run_doc.query.fields;
  if (run_doc.query?.expand)  params.expand  = run_doc.query.expand;

  const take = run_doc.query?.take;
  const skip = run_doc.query?.skip;

  let items, meta;

  if (take !== undefined) {
    const page   = skip ? Math.floor(skip / take) + 1 : 1;
    const result = await globalThis.pb
      .collection(config.collection)
      .getList(page, take, params);
    items = result.items;
    meta  = {
      total:      result.totalItems,
      page:       result.page,
      pageSize:   result.perPage,
      totalPages: result.totalPages,
      hasMore:    result.page < result.totalPages,
    };
  } else {
    items = await globalThis.pb
      .collection(config.collection)
      .getFullList(params);
    meta = {
      total:      items.length,
      page:       1,
      pageSize:   items.length,
      totalPages: 1,
      hasMore:    false,
    };
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

  const created = await globalThis.pb
    .collection(config.collection)
    .create({ id: doc.name, ...top, data });

  run_doc.target  = { data: [_mergeRecord(created)], meta: { id: created.id, name: created.name } };
  run_doc.success = true;
}

// ============================================================
// UPDATE
// ============================================================

async function update(run_doc) {
  const doc           = run_doc.input;
  const { top, data } = _splitRecord(doc);

  const filter   = _buildFilter(run_doc);
  if (!filter) { run_doc.error = "400 update: missing query.where"; return; }

  const existing = await globalThis.pb
    .collection(config.collection)
    .getFullList({ filter });

  if (!existing.length) {
    run_doc.target  = { data: [], meta: { updated: 0 } };
    run_doc.success = true;
    return;
  }

  const updated = await Promise.all(existing.map(async rec => {
    const mergedData = { ...rec.data, ...data };
    await globalThis.pb
      .collection(config.collection)
      .update(rec.id, { ...top, data: mergedData });
    return { ...mergedData, ...top };
  }));

  run_doc.target  = { data: updated, meta: { updated: updated.length } };
  run_doc.success = true;
}

// ============================================================
// DELETE (soft — sets docstatus = 2 via update)
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
