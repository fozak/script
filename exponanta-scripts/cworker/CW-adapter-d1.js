// ============================================================
// CW-adapter-d1.js
// Pure D1/SQLite connector. No business logic.
// All functions: function(run_doc) — mutate only, no return.
// Reads from run_doc.target.data[0] — never from run_doc.input
// Isomorphic: direct D1 in Worker, _post to hub in browser
// ============================================================

(() => {
  const cfg = () => globalThis.CW._config;

  // ============================================================
  // RECORD HELPERS — D1 specific (arrays serialized to JSON strings)
  // ============================================================

  function _splitRecord(doc) {
    const top = {};
    const data = {};
    for (const [k, v] of Object.entries(doc)) {
      if (
        CW._config.topLevelFields.has(k) ||
        /^[\w]+[+-]$|^[+-][\w]+$/.test(k) ||
        v instanceof File
      ) {
        top[k] =
          Array.isArray(v) || (v && typeof v === "object")
            ? JSON.stringify(v)
            : v;
      } else {
        data[k] = v;
      }
    }
    return { top, data };
  }

  function _mergeRecord(rec) {
    const raw = rec.data;
    const doc = Object.assign(
      {},
      typeof raw === "string" ? JSON.parse(raw || "{}") : raw || {},
    );
    for (const k of CW._config.topLevelFields) {
      if (!(k in rec)) continue;
      const v = rec[k];
      if (typeof v === "string" && (v.startsWith("[") || v.startsWith("{"))) {
        try {
          doc[k] = JSON.parse(v);
        } catch {
          doc[k] = v;
        }
      } else {
        doc[k] = v;
      }
    }
    return doc;
  }

  // ============================================================
  // TRANSPORT — browser → Worker → D1
  // ============================================================

  const _post = async (run_doc) => {
    const res = await fetch(cfg().hub.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: run_doc.user?.token || "",
      },
      body: JSON.stringify(run_doc),
    });
    Object.assign(run_doc, await res.json());
  };

  // ============================================================
  // RecordFieldResolver — query.where → SQL WHERE + bound params
  // ============================================================

  function RecordFieldResolver(run_doc) {
    const params = [];

    function resolveField(key) {
      return cfg().topLevelFields.has(key)
        ? `item.${key}`
        : `json_extract(item.data, '$.${key}')`;
    }

    function resolveOperator(field, op, value) {
      switch (op) {
        case "equals":
          params.push(value);
          return `${field} = ?`;
        case "contains":
          params.push(`%${value}%`);
          return `${field} LIKE ?`;
        case "gt":
          params.push(value);
          return `${field} > ?`;
        case "gte":
          params.push(value);
          return `${field} >= ?`;
        case "lt":
          params.push(value);
          return `${field} < ?`;
        case "lte":
          params.push(value);
          return `${field} <= ?`;
        case "not":
          params.push(value);
          return `${field} != ?`;
        case "in":
          if (Array.isArray(value) && value.length) {
            value.forEach((v) => params.push(v));
            return `${field} IN (${value.map(() => "?").join(",")})`;
          }
          return null;
        default:
          return null;
      }
    }

    function resolve(where) {
      if (!where || typeof where !== "object") return "";
      const parts = [];

      for (const [key, value] of Object.entries(where)) {
        if (key === "OR") {
          const p = value.map((w) => resolve(w)).filter(Boolean);
          if (p.length) parts.push(`(${p.join(" OR ")})`);
          continue;
        }
        if (key === "AND") {
          const p = value.map((w) => resolve(w)).filter(Boolean);
          if (p.length) parts.push(`(${p.join(" AND ")})`);
          continue;
        }
        if (key === "NOT") {
          const p = resolve(value);
          if (p) parts.push(`NOT (${p})`);
          continue;
        }

        const field = resolveField(key);

        if (value === null || value === undefined) {
          parts.push(`${field} IS NULL`);
        } else if (typeof value === "string") {
          params.push(value);
          parts.push(`${field} = ?`);
        } else if (typeof value === "number" || typeof value === "boolean") {
          params.push(value);
          parts.push(`${field} = ?`);
        } else if (typeof value === "object" && !Array.isArray(value)) {
          for (const [op, opValue] of Object.entries(value)) {
            const expr = resolveOperator(field, op, opValue);
            if (expr) parts.push(expr);
          }
        }
      }
      return parts.join(" AND ");
    }

    return { resolve, params };
  }

  // ============================================================
  // _buildFilter — doctype + query.where → SQL WHERE + params
  // ============================================================

  function _buildFilter(run_doc) {
    const doctype = run_doc.target_doctype ?? run_doc.source_doctype;
    const resolver = RecordFieldResolver(run_doc);
    const parts = [];
    const params = [];

    if (doctype) {
      parts.push(`item.doctype = ?`);
      params.push(doctype);
    }

    const where = run_doc.query?.where;
    if (where) {
      const clause = resolver.resolve(where);
      if (clause) parts.push(`(${clause})`);
      params.push(...resolver.params);
    }

    return { clause: parts.join(" AND "), params };
  }

  // ============================================================
  // _buildSort
  // ============================================================

  function _buildSort(run_doc) {
    const sort = run_doc.query?.sort;
    if (!sort) return "item.modified DESC";
    if (typeof sort === "string") return sort;
    return Object.entries(sort)
      .map(([f, dir]) => {
        const col = cfg().topLevelFields.has(f)
          ? `item.${f}`
          : `json_extract(item.data, '$.${f}')`;
        return `${col} ${dir === "desc" ? "DESC" : "ASC"}`;
      })
      .join(", ");
  }

  // ============================================================
  // _buildLimit
  // ============================================================

  function _buildLimit(run_doc) {
    const perPage = run_doc.query?.perPage;
    const page = run_doc.query?.page || 1;
    if (!perPage) return { sql: "", params: [] };
    return { sql: "LIMIT ? OFFSET ?", params: [perPage, (page - 1) * perPage] };
  }

  // ============================================================
  // SELECT
  // ============================================================

  async function select(run_doc) {
    if (!globalThis.env?.DB) {
      await _post(run_doc);
      return;
    }

    const doctype = run_doc.target_doctype ?? run_doc.source_doctype;
    const { clause, params: filterParams } = _buildFilter(run_doc);
    const aclParams = cfg().sql.aclParams(run_doc.user);
    const sort = _buildSort(run_doc);
    const limit = _buildLimit(run_doc);
    const baseSQL =
      CW.Schema?.[doctype]?.listSQL?.(cfg()) || cfg().sql.listSQL(cfg());

    const sql = `
    ${baseSQL}
    ${clause ? `AND (${clause})` : ""}
    ORDER BY ${sort}
    ${limit.sql}
  `.trim();

    try {
      const rows = await globalThis.env.DB.prepare(sql)
        .bind(...aclParams, ...filterParams, ...limit.params)
        .all();

      run_doc.target = {
        data: rows.results.map(_mergeRecord),
        meta: { total: rows.results.length },
      };
      run_doc.success = true;
    } catch (err) {
      run_doc.error = err.message;
    }
  }

  // ============================================================
  // CREATE
  // ============================================================

  async function create(run_doc) {
    if (!globalThis.env?.DB) {
      await _post(run_doc);
      return;
    }

    const doc = run_doc.target?.data?.[0];
    if (!doc) {
      run_doc.error = "400 create: no target document";
      return;
    }

    const { top, data } = _splitRecord(doc);
    const topKeys = Object.keys(top);
    const topVals = Object.values(top);

    const sql = `
    INSERT INTO ${cfg().collection}
    (${topKeys.join(", ")}, data)
    VALUES (${topKeys.map(() => "?").join(", ")}, ?)
  `;

    try {
      await globalThis.env.DB.prepare(sql)
        .bind(...topVals, JSON.stringify(data))
        .run();

      run_doc.target = { data: [doc], meta: { name: doc.name } };
      run_doc.success = true;
    } catch (err) {
      run_doc.error = err.message;
    }
  }

  // ============================================================
  // UPDATE — optimistic upsert
  // ============================================================

  async function update(run_doc) {
    if (!globalThis.env?.DB) {
      await _post(run_doc);
      return;
    }

    const doc = run_doc.target?.data?.[0];
    //test
    //console.log("D1 update doc.status:", doc?.status);
    //console.log("D1 update doc keys:", Object.keys(doc || {}));
    if (!doc?.name) {
      run_doc.error = "400 update: no target document";
      return;
    }

    const { top, data } = _splitRecord(doc);

    try {
      const existing = await globalThis.env.DB.prepare(
        `SELECT data FROM ${cfg().collection} WHERE name = ?`,
      )
        .bind(doc.name)
        .first();

      if (!existing) return create(run_doc); // upsert

      const merged = { ...JSON.parse(existing.data || "{}"), ...data };
      const topKeys = Object.keys(top);
      const topVals = Object.values(top);
      const setCols = [...topKeys.map((k) => `${k} = ?`), "data = ?"].join(
        ", ",
      );

      await globalThis.env.DB.prepare(
        `UPDATE ${cfg().collection} SET ${setCols} WHERE name = ?`,
      )
        .bind(...topVals, JSON.stringify(merged), doc.name)
        .run();

      run_doc.target = {
        data: [_mergeRecord({ ...top, data: merged })],
        meta: { updated: 1 },
      };
      run_doc.success = true;
    } catch (err) {
      run_doc.error = err.message;
    }
  }

  // ============================================================
  // DELETE — soft delete, docstatus = 2
  // ============================================================

  async function del(run_doc) {
    if (!globalThis.env?.DB) {
      await _post(run_doc);
      return;
    }
    if (run_doc.target?.data?.[0]) run_doc.target.data[0].docstatus = 2;
    await globalThis.Adapters.d1.update(run_doc);
  }

  // ============================================================
  // SELF-REGISTER
  // ============================================================

  globalThis.Adapters = globalThis.Adapters || {};
  globalThis.Adapters.d1 = { select, create, update, delete: del };

  console.log("✅ CW-adapter-d1.js loaded");
})();
