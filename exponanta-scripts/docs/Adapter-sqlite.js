

{
  "name": "sqlite-local",
  "doctype": "Adapter",
  "config": {
    "url": "http://localhost:3000",
    "table": "item"
  },
  "functions": {
  "init": "async function(run_doc) { const config = runtime.config; const table = config.table || 'item'; await runtime.sql('CREATE TABLE IF NOT EXISTS ' + table + \" (id TEXT PRIMARY KEY, data TEXT DEFAULT '{}')\"); await runtime.sql('CREATE INDEX IF NOT EXISTS idx_name ON ' + table + \"(json_extract(data, '$.name'))\"); await runtime.sql('CREATE INDEX IF NOT EXISTS idx_doctype ON ' + table + \"(json_extract(data, '$.doctype'))\"); await runtime.sql('CREATE INDEX IF NOT EXISTS idx_docstatus ON ' + table + \"(json_extract(data, '$.docstatus'))\"); await runtime.sql('CREATE INDEX IF NOT EXISTS idx_created ON ' + table + \"(json_extract(data, '$.created'))\"); await runtime.sql('CREATE INDEX IF NOT EXISTS idx_updated ON ' + table + \"(json_extract(data, '$.updated'))\"); console.log('SQLite adapter ready:', config.url); }",
  "sql": "async function(query, params) { params = params || []; const res = await fetch(runtime.config.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: query, params: params }) }); if (!res.ok) { const err = await res.json().catch(function() { return { error: res.statusText }; }); throw new Error('SQLite HTTP error: ' + (err.error || res.statusText)); } const results = await res.json(); return Array.isArray(results[0]) ? results[0] : results; }",
  "unpack": "function(row) { if (!row) return null; try { return JSON.parse(row.data || '{}'); } catch(e) { return {}; } }",
  "generateId": "function(doctype) { var ts = Date.now(); var rand = Math.random().toString(36).substring(2, 8); return (doctype || 'record').toLowerCase() + '-' + ts + '-' + rand; }",
  "col": "function(field) { if (field === 'id') return 'id'; return \"json_extract(data, '$.\" + field + \"')\"; }",
  "whereToSQL": "function(where) { if (!where || typeof where !== 'object') return { sql: '', params: [] }; var parts = []; var params = []; for (var key in where) { var value = where[key]; if (key === 'OR') { var sub = value.map(function(c) { return runtime.whereToSQL(c); }).filter(function(r) { return r.sql; }); if (sub.length) { parts.push('(' + sub.map(function(r) { return r.sql; }).join(' OR ') + ')'); sub.forEach(function(r) { params = params.concat(r.params); }); } continue; } if (key === 'AND') { var sub2 = value.map(function(c) { return runtime.whereToSQL(c); }).filter(function(r) { return r.sql; }); if (sub2.length) { parts.push('(' + sub2.map(function(r) { return r.sql; }).join(' AND ') + ')'); sub2.forEach(function(r) { params = params.concat(r.params); }); } continue; } if (key === 'NOT') { var res = runtime.whereToSQL(value); if (res.sql) { parts.push('NOT (' + res.sql + ')'); params = params.concat(res.params); } continue; } var c = runtime.col(key); if (value === null || value === undefined) { parts.push(c + ' IS NULL'); continue; } if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') { parts.push(c + ' = ?'); params.push(value); continue; } if (typeof value === 'object' && !Array.isArray(value)) { for (var op in value) { var opVal = value[op]; if (op === 'equals') { parts.push(c + ' = ?'); params.push(opVal); } else if (op === 'not') { parts.push(c + ' != ?'); params.push(opVal); } else if (op === 'contains') { parts.push(c + ' LIKE ?'); params.push('%' + opVal + '%'); } else if (op === 'startsWith') { parts.push(c + ' LIKE ?'); params.push(opVal + '%'); } else if (op === 'endsWith') { parts.push(c + ' LIKE ?'); params.push('%' + opVal); } else if (op === 'gt') { parts.push(c + ' > ?'); params.push(opVal); } else if (op === 'gte') { parts.push(c + ' >= ?'); params.push(opVal); } else if (op === 'lt') { parts.push(c + ' < ?'); params.push(opVal); } else if (op === 'lte') { parts.push(c + ' <= ?'); params.push(opVal); } else if (op === 'in' && Array.isArray(opVal) && opVal.length) { parts.push(c + ' IN (' + opVal.map(function() { return '?'; }).join(',') + ')'); params = params.concat(opVal); } else if (op === 'notIn' && Array.isArray(opVal) && opVal.length) { parts.push(c + ' NOT IN (' + opVal.map(function() { return '?'; }).join(',') + ')'); params = params.concat(opVal); } } } } return { sql: parts.join(' AND '), params: params }; }",
  "rbacFilter": "function(user, operation) { var isWrite = ['update', 'delete', 'create'].indexOf((operation || '').toLowerCase()) !== -1; var userAllowed = JSON.stringify(user._allowed_read || []); if (isWrite) { return { sql: \"json_extract(data, '$.owner') = ? OR EXISTS (SELECT 1 FROM json_each(json_extract(data, '$._allowed')) rec JOIN json_each(?) usr ON usr.value = rec.value)\", params: [user.name, userAllowed] }; } return { sql: \"json_extract(data, '$.owner') = ? OR EXISTS (SELECT 1 FROM json_each(json_extract(data, '$._allowed_read')) r WHERE r.value = 'roleispublic') OR EXISTS (SELECT 1 FROM json_each(json_extract(data, '$._allowed')) rec JOIN json_each(?) usr ON usr.value = rec.value) OR EXISTS (SELECT 1 FROM json_each(json_extract(data, '$._allowed_read')) rec JOIN json_each(?) usr ON usr.value = rec.value)\", params: [user.name, userAllowed, userAllowed] }; }",
  "buildWhere": "function(run_doc) { var source_doctype = run_doc.source_doctype; var query = run_doc.query || {}; var user = run_doc.user; var parts = []; var params = []; if (source_doctype && source_doctype !== 'All') { parts.push(\"json_extract(data, '$.doctype') = ?\"); params.push(source_doctype); } if (query.where) { var w = runtime.whereToSQL(query.where); if (w.sql) { parts.push('(' + w.sql + ')'); params = params.concat(w.params); } } if (user) { var r = runtime.rbacFilter(user, run_doc.operation); parts.push('(' + r.sql + ')'); params = params.concat(r.params); } if (parts.length === 0) return null; return { sql: parts.join(' AND '), params: params }; }",
  "buildSort": "function(orderBy) { if (!orderBy) return null; var entries = Array.isArray(orderBy) ? orderBy.reduce(function(acc, o) { return acc.concat(Object.entries(o)); }, []) : Object.entries(orderBy); return entries.map(function(e) { return runtime.col(e[0]) + ' ' + (e[1].toUpperCase() === 'DESC' ? 'DESC' : 'ASC'); }).join(', '); }",
  "selectSQL": "function(where, sort, take, skip) { var table = runtime.config.table || 'item'; var sql = 'SELECT * FROM ' + table; var params = []; if (where) { sql += ' WHERE ' + where.sql; params = params.concat(where.params); } if (sort) { sql += ' ORDER BY ' + sort; } if (take !== undefined) { sql += ' LIMIT ?'; params.push(take); } if (skip !== undefined) { sql += ' OFFSET ?'; params.push(skip); } return { sql: sql, params: params }; }",
  "select": "async function(run_doc) { var query = run_doc.query || {}; var take = query.take; var skip = query.skip; var where = runtime.buildWhere(run_doc); var sort = runtime.buildSort(query.orderBy); var built = runtime.selectSQL(where, sort, take, skip); var rows = await runtime.sql(built.sql, built.params); var data = rows.map(function(r) { return runtime.unpack(r); }); var total = data.length; if (take !== undefined) { var table = runtime.config.table || 'item'; var countSQL = 'SELECT COUNT(*) as count FROM ' + table + (where ? ' WHERE ' + where.sql : ''); var countRows = await runtime.sql(countSQL, where ? where.params : []); total = (countRows[0] && countRows[0].count) || data.length; } var page = (skip && take) ? Math.floor(skip / take) + 1 : 1; var totalPages = take ? Math.ceil(total / take) : 1; return { data: data, meta: { total: total, page: page, pageSize: take || total, totalPages: totalPages, hasMore: page < totalPages } }; }",
  "create": "async function(run_doc) { var inputData = (run_doc.input && run_doc.input.data) ? run_doc.input.data : run_doc.input; if (!inputData || Object.keys(inputData).length === 0) throw new Error('CREATE requires input data'); var now = new Date().toISOString(); var id = inputData.name || runtime.generateId(run_doc.target_doctype); var record = Object.assign({}, inputData, { name: id, doctype: inputData.doctype || run_doc.target_doctype, created: inputData.created || now, updated: now }); var table = runtime.config.table || 'item'; await runtime.sql('INSERT INTO ' + table + ' (id, data) VALUES (?, ?)', [id, JSON.stringify(record)]); var rows = await runtime.sql('SELECT * FROM ' + table + ' WHERE id = ?', [id]); return { data: runtime.unpack(rows[0]), meta: { operation: 'create', id: id, name: id } }; }",
  "update": "async function(run_doc) { var inputData = (run_doc.input && run_doc.input.data) ? run_doc.input.data : run_doc.input; var where = runtime.buildWhere(run_doc); var built = runtime.selectSQL(where); var existingRows = await runtime.sql(built.sql, built.params); if (existingRows.length === 0) return { data: [], meta: { operation: 'update', updated: 0 } }; var updated = []; var table = runtime.config.table || 'item'; for (var i = 0; i < existingRows.length; i++) { var row = existingRows[i]; var existing = runtime.unpack(row); var merged = Object.assign({}, existing, inputData, { name: existing.name, doctype: existing.doctype, updated: new Date().toISOString() }); await runtime.sql('UPDATE ' + table + ' SET data = ? WHERE id = ?', [JSON.stringify(merged), row.id]); var updatedRows = await runtime.sql('SELECT * FROM ' + table + ' WHERE id = ?', [row.id]); updated.push(runtime.unpack(updatedRows[0])); } return { data: updated, meta: { operation: 'update', updated: updated.length } }; }",
  "delete": "async function(run_doc) { var query = run_doc.query || {}; if (!query.where || Object.keys(query.where).length === 0) throw new Error('DELETE requires query.where to prevent mass deletion'); var where = runtime.buildWhere(run_doc); var built = runtime.selectSQL(where); var table = runtime.config.table || 'item'; var rows = await runtime.sql(built.sql, built.params); if (rows.length === 0) return { data: [], meta: { operation: 'delete', deleted: 0 } }; for (var i = 0; i < rows.length; i++) { await runtime.sql('DELETE FROM ' + table + ' WHERE id = ?', [rows[i].id]); } return { data: [], meta: { operation: 'delete', deleted: rows.length } }; }",
  "execute": "async function(run_doc) { var op = (run_doc.operation || '').toLowerCase(); if (op === 'select' || op === 'takeone') return await runtime.select(run_doc); if (op === 'create') return await runtime.create(run_doc); if (op === 'update') return await runtime.update(run_doc); if (op === 'delete') return await runtime.delete(run_doc); throw new Error('SQLite adapter: unsupported operation: ' + op); }"
}
}


//Example 

// Step 1: Create a role id (just a string, simulate generateId)
const roleProjectUser = "role-project-user";
const roleAdmin = "role-admin";

// Step 2: Create User record
await CW.Adapter["sqlite-local"].create({
  target_doctype: "User",
  input: {
    doctype: "User",
    name: "user-john",
    email: "john@test.com",
    _allowed_read: [roleProjectUser],  // John's capabilities
    _allowed: [],
    owner: ""
  }
})

// Step 3: Create Task John CAN read (matching role)
await CW.Adapter["sqlite-local"].create({
  target_doctype: "Task",
  input: {
    doctype: "Task",
    title: "Task John can read",
    status: "Open",
    _allowed_read: [roleProjectUser],  // matches John's capability
    _allowed: [roleAdmin],
    owner: ""
  }
})

// Step 4: Create Task John CANNOT read
await CW.Adapter["sqlite-local"].create({
  target_doctype: "Task",
  input: {
    doctype: "Task",
    title: "Task John cannot read",
    status: "Open",
    _allowed_read: [roleAdmin],  // John doesn't have this
    _allowed: [roleAdmin],
    owner: ""
  }
})
VM1559:1 Fetch finished loading: POST "http://localhost:3000/".
eval @ VM1559:1
eval @ VM1569:1
(anonymous) @ VM1584:6
VM1559:1 Fetch finished loading: POST "http://localhost:3000/".
eval @ VM1559:1
eval @ VM1569:1
await in eval
(anonymous) @ VM1584:6
VM1559:1 Fetch finished loading: POST "http://localhost:3000/".
eval @ VM1559:1
eval @ VM1569:1
(anonymous) @ VM1584:19
VM1559:1 Fetch finished loading: POST "http://localhost:3000/".
eval @ VM1559:1
eval @ VM1569:1
await in eval
(anonymous) @ VM1584:19
VM1559:1 Fetch finished loading: POST "http://localhost:3000/".
eval @ VM1559:1
eval @ VM1569:1
(anonymous) @ VM1584:32
VM1559:1 Fetch finished loading: POST "http://localhost:3000/".
eval @ VM1559:1
eval @ VM1569:1
await in eval
(anonymous) @ VM1584:32
{data: {…}, meta: {…}}
// Should return only 1 task (the one John can read)
await CW.Adapter["sqlite-local"].select({
  source_doctype: "Task",
  query: { where: { status: "Open" } },
  user: {
    name: "user-john",
    _allowed_read: ["role-project-user"]
  }
})

// version 2. with JSON column only. NOT json

// ============================================================================
// pb-adapter-sqlite.js - SQLite HTTP Adapter for CW Framework
// Schema: item(id TEXT PRIMARY KEY, data TEXT DEFAULT '{}')
// All fields live in data JSON. Adapter handles pack/unpack transparently.
// Usage: coworker.run({ ..., options: { adapter: 'sqlite' } })
// ============================================================================

pb._adapters = pb._adapters || {};

pb._adapters.sqlite = {

  // --------------------------------------------------------------------------
  // CONFIG
  // --------------------------------------------------------------------------
  config: {
    url: "http://localhost:3000",
    table: "item",
  },

  // --------------------------------------------------------------------------
  // INIT - Create table and indexes if not exist
  // Call once on startup: pb._adapters.sqlite.init()
  // --------------------------------------------------------------------------
  async init() {
    await this._sql(`
      CREATE TABLE IF NOT EXISTS ${this.config.table} (
        id   TEXT PRIMARY KEY,
        data TEXT DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_name      ON ${this.config.table}(json_extract(data, '$.name'));
      CREATE INDEX IF NOT EXISTS idx_doctype   ON ${this.config.table}(json_extract(data, '$.doctype'));
      CREATE INDEX IF NOT EXISTS idx_docstatus ON ${this.config.table}(json_extract(data, '$.docstatus'));
      CREATE INDEX IF NOT EXISTS idx_created   ON ${this.config.table}(json_extract(data, '$.created'));
      CREATE INDEX IF NOT EXISTS idx_updated   ON ${this.config.table}(json_extract(data, '$.updated'));
    `);
    console.log("✅ SQLite adapter: table and indexes ready");
  },

  // --------------------------------------------------------------------------
  // UNIVERSAL ENTRY POINT
  // --------------------------------------------------------------------------
  async execute(run_doc) {
    const op = run_doc.operation?.toLowerCase();
    switch (op) {
      case "select":
      case "takeone": return await this._select(run_doc);
      case "create":  return await this._create(run_doc);
      case "update":  return await this._update(run_doc);
      case "delete":  return await this._delete(run_doc);
      default: throw new Error(`SQLite adapter: unsupported operation "${op}"`);
    }
  },

  // --------------------------------------------------------------------------
  // SELECT
  // --------------------------------------------------------------------------
  async _select(run_doc) {
    const { query = {} } = run_doc;
    const { take, skip, orderBy } = query;

    const where = this._buildWhere(run_doc);
    const sort  = this._buildSort(orderBy);

    const { sql, params } = this._selectSQL(where, sort, take, skip);
    const rows = await this._sql(sql, params);
    const data = rows.map(r => this._unpack(r));

    let total = data.length;
    if (take !== undefined) {
      const countRows = await this._sql(
        `SELECT COUNT(*) as count FROM ${this.config.table}${where ? ` WHERE ${where.sql}` : ""}`,
        where ? where.params : []
      );
      total = countRows[0]?.count ?? data.length;
    }

    const page       = skip && take ? Math.floor(skip / take) + 1 : 1;
    const totalPages = take ? Math.ceil(total / take) : 1;

    return {
      data,
      meta: {
        total,
        page,
        pageSize: take || total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  },

  // --------------------------------------------------------------------------
  // CREATE
  // --------------------------------------------------------------------------
  async _create(run_doc) {
    const inputData = run_doc.input?.data || run_doc.input;

    if (!inputData || Object.keys(inputData).length === 0) {
      throw new Error("CREATE requires input data");
    }

    const now    = new Date().toISOString();
    const id     = inputData.name || this._generateId(run_doc.target_doctype);
    const record = {
      ...inputData,
      name:    id,
      doctype: inputData.doctype || run_doc.target_doctype,
      created: inputData.created || now,
      updated: now,
    };

    await this._sql(
      `INSERT INTO ${this.config.table} (id, data) VALUES (?, ?)`,
      [id, JSON.stringify(record)]
    );

    const rows = await this._sql(
      `SELECT * FROM ${this.config.table} WHERE id = ?`,
      [id]
    );

    return {
      data: this._unpack(rows[0]),
      meta: { operation: "create", id, name: id },
    };
  },

  // --------------------------------------------------------------------------
  // UPDATE
  // --------------------------------------------------------------------------
  async _update(run_doc) {
    const inputData = run_doc.input?.data || run_doc.input;
    const where     = this._buildWhere(run_doc);

    const { sql: selSql, params: selParams } = this._selectSQL(where);
    const existingRows = await this._sql(selSql, selParams);

    if (existingRows.length === 0) {
      return { data: [], meta: { operation: "update", updated: 0 } };
    }

    const updated = [];

    for (const row of existingRows) {
      const existing = this._unpack(row);
      const merged   = {
        ...existing,
        ...inputData,
        name:    existing.name,     // immutable
        doctype: existing.doctype,  // immutable
        updated: new Date().toISOString(),
      };

      await this._sql(
        `UPDATE ${this.config.table} SET data = ? WHERE id = ?`,
        [JSON.stringify(merged), row.id]
      );

      const updatedRows = await this._sql(
        `SELECT * FROM ${this.config.table} WHERE id = ?`,
        [row.id]
      );
      updated.push(this._unpack(updatedRows[0]));
    }

    return {
      data: updated,
      meta: { operation: "update", updated: updated.length },
    };
  },

  // --------------------------------------------------------------------------
  // DELETE
  // --------------------------------------------------------------------------
  async _delete(run_doc) {
    const { query = {} } = run_doc;

    if (!query.where || Object.keys(query.where).length === 0) {
      throw new Error("DELETE requires query.where to prevent mass deletion");
    }

    const where = this._buildWhere(run_doc);
    const { sql: selSql, params: selParams } = this._selectSQL(where);
    const rows = await this._sql(selSql, selParams);

    if (rows.length === 0) {
      return { data: [], meta: { operation: "delete", deleted: 0 } };
    }

    for (const row of rows) {
      await this._sql(
        `DELETE FROM ${this.config.table} WHERE id = ?`,
        [row.id]
      );
    }

    return {
      data: [],
      meta: { operation: "delete", deleted: rows.length },
    };
  },

  // --------------------------------------------------------------------------
  // WHERE BUILDER
  // Combines: doctype filter + query.where + RBAC
  // --------------------------------------------------------------------------
  _buildWhere(run_doc) {
    const { source_doctype, query = {}, user } = run_doc;
    const parts  = [];
    const params = [];

    // 1. doctype filter
    if (source_doctype && source_doctype !== "All") {
      parts.push(`json_extract(data, '$.doctype') = ?`);
      params.push(source_doctype);
    }

    // 2. query.where (Prisma-style object)
    if (query.where) {
      const { sql: wSql, params: wParams } = this._whereToSQL(query.where);
      if (wSql) {
        parts.push(`(${wSql})`);
        params.push(...wParams);
      }
    }

    // 3. RBAC (when user context present in run_doc)
    if (user) {
      const { sql: rbacSql, params: rbacParams } = this._rbacFilter(user, run_doc.operation);
      parts.push(`(${rbacSql})`);
      params.push(...rbacParams);
    }

    if (parts.length === 0) return null;
    return { sql: parts.join(" AND "), params };
  },

  // --------------------------------------------------------------------------
  // RBAC FILTER - Pure SQL implementation of PocketBase ViewRule/UpdateRule
  //
  // Read:
  //   owner = user.name
  //   OR _allowed_read contains 'roleispublic'
  //   OR user._allowed_read ∩ record._allowed   (write role → can read)
  //   OR user._allowed_read ∩ record._allowed_read
  //
  // Write:
  //   owner = user.name
  //   OR user._allowed_read ∩ record._allowed
  //
  // user._allowed_read comes from run_doc.user (resolved from JWT, never token)
  // --------------------------------------------------------------------------
  _rbacFilter(user, operation) {
    const isWrite     = ["update", "delete", "create"].includes(operation?.toLowerCase());
    const userAllowed = JSON.stringify(user._allowed_read || []);

    if (isWrite) {
      return {
        sql: `
          json_extract(data, '$.owner') = ?
          OR EXISTS (
            SELECT 1
            FROM json_each(json_extract(data, '$._allowed')) rec
            JOIN json_each(?) usr ON usr.value = rec.value
          )
        `,
        params: [user.name, userAllowed],
      };
    }

    // Read
    return {
      sql: `
        json_extract(data, '$.owner') = ?
        OR EXISTS (
          SELECT 1 FROM json_each(json_extract(data, '$._allowed_read')) r
          WHERE r.value = 'roleispublic'
        )
        OR EXISTS (
          SELECT 1
          FROM json_each(json_extract(data, '$._allowed')) rec
          JOIN json_each(?) usr ON usr.value = rec.value
        )
        OR EXISTS (
          SELECT 1
          FROM json_each(json_extract(data, '$._allowed_read')) rec
          JOIN json_each(?) usr ON usr.value = rec.value
        )
      `,
      params: [user.name, userAllowed, userAllowed],
    };
  },

  // --------------------------------------------------------------------------
  // PRISMA WHERE OBJECT → SQL
  // --------------------------------------------------------------------------
  _whereToSQL(where) {
    if (!where || typeof where !== "object") return { sql: "", params: [] };

    const parts  = [];
    const params = [];

    for (const [key, value] of Object.entries(where)) {

      if (key === "OR") {
        const sub = value.map(c => this._whereToSQL(c)).filter(r => r.sql);
        if (sub.length) {
          parts.push(`(${sub.map(r => r.sql).join(" OR ")})`);
          sub.forEach(r => params.push(...r.params));
        }
        continue;
      }

      if (key === "AND") {
        const sub = value.map(c => this._whereToSQL(c)).filter(r => r.sql);
        if (sub.length) {
          parts.push(`(${sub.map(r => r.sql).join(" AND ")})`);
          sub.forEach(r => params.push(...r.params));
        }
        continue;
      }

      if (key === "NOT") {
        const { sql: s, params: p } = this._whereToSQL(value);
        if (s) { parts.push(`NOT (${s})`); params.push(...p); }
        continue;
      }

      const col = this._col(key);

      if (value === null || value === undefined) {
        parts.push(`${col} IS NULL`);
        continue;
      }

      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        parts.push(`${col} = ?`);
        params.push(value);
        continue;
      }

      if (typeof value === "object" && !Array.isArray(value)) {
        for (const [op, opVal] of Object.entries(value)) {
          switch (op) {
            case "equals":     parts.push(`${col} = ?`);        params.push(opVal);          break;
            case "not":        parts.push(`${col} != ?`);       params.push(opVal);          break;
            case "contains":   parts.push(`${col} LIKE ?`);     params.push(`%${opVal}%`);   break;
            case "startsWith": parts.push(`${col} LIKE ?`);     params.push(`${opVal}%`);    break;
            case "endsWith":   parts.push(`${col} LIKE ?`);     params.push(`%${opVal}`);    break;
            case "gt":         parts.push(`${col} > ?`);        params.push(opVal);          break;
            case "gte":        parts.push(`${col} >= ?`);       params.push(opVal);          break;
            case "lt":         parts.push(`${col} < ?`);        params.push(opVal);          break;
            case "lte":        parts.push(`${col} <= ?`);       params.push(opVal);          break;
            case "in":
              if (Array.isArray(opVal) && opVal.length) {
                parts.push(`${col} IN (${opVal.map(() => "?").join(",")})`);
                params.push(...opVal);
              }
              break;
            case "notIn":
              if (Array.isArray(opVal) && opVal.length) {
                parts.push(`${col} NOT IN (${opVal.map(() => "?").join(",")})`);
                params.push(...opVal);
              }
              break;
          }
        }
      }
    }

    return { sql: parts.join(" AND "), params };
  },

  // --------------------------------------------------------------------------
  // SORT BUILDER
  // --------------------------------------------------------------------------
  _buildSort(orderBy) {
    if (!orderBy) return null;

    const entries = Array.isArray(orderBy)
      ? orderBy.flatMap(o => Object.entries(o))
      : Object.entries(orderBy);

    return entries
      .map(([field, dir]) => `${this._col(field)} ${dir.toUpperCase() === "DESC" ? "DESC" : "ASC"}`)
      .join(", ");
  },

  // --------------------------------------------------------------------------
  // SELECT SQL ASSEMBLER
  // --------------------------------------------------------------------------
  _selectSQL(where, sort, take, skip) {
    let sql      = `SELECT * FROM ${this.config.table}`;
    const params = [];

    if (where)             { sql += ` WHERE ${where.sql}`;  params.push(...where.params); }
    if (sort)              { sql += ` ORDER BY ${sort}`; }
    if (take !== undefined){ sql += ` LIMIT ?`;  params.push(take); }
    if (skip !== undefined){ sql += ` OFFSET ?`; params.push(skip); }

    return { sql, params };
  },

  // --------------------------------------------------------------------------
  // FIELD → SQL COLUMN
  // Only 'id' is a real column. Everything else is json_extract.
  // --------------------------------------------------------------------------
  _col(field) {
    if (field === "id") return "id";
    return `json_extract(data, '$.${field}')`;
  },

  // --------------------------------------------------------------------------
  // SERIALIZE / DESERIALIZE
  // App always works with flat records. Adapter handles data wrapping.
  // --------------------------------------------------------------------------
  _unpack(row) {
    if (!row) return null;
    try { return JSON.parse(row.data || "{}"); }
    catch { return {}; }
  },

  _pack(record) {
    return JSON.stringify(record);
  },

  // --------------------------------------------------------------------------
  // HTTP → SQLite server
  // --------------------------------------------------------------------------
  async _sql(query, params = []) {
    const res = await fetch(this.config.url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ query, params }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(`SQLite HTTP error: ${err.error || res.statusText}`);
    }

    const results = await res.json();
    return Array.isArray(results[0]) ? results[0] : results;
  },

  // --------------------------------------------------------------------------
  // UTILS
  // --------------------------------------------------------------------------
  _generateId(doctype = "record") {
    const ts     = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${doctype.toLowerCase()}-${ts}-${random}`;
  },
};

// --------------------------------------------------------------------------
// Wire coworker._db → adapter.execute
// --------------------------------------------------------------------------
if (typeof coworker !== "undefined") {
  coworker._db = async function (run_doc) {
    const adapterName = run_doc.options?.adapter || "pocketbase";
    const adapter     = pb._adapters[adapterName];
    if (!adapter) throw new Error(`Adapter "${adapterName}" not found`);
    return await adapter.execute(run_doc);
  };

  console.log("✅ SQLite adapter loaded — use options: { adapter: 'sqlite' }");
}



// version 1.0 FULL flat tables

// ============================================================================
// pb-adapter-sqlite.js - SQLite HTTP Adapter for CW Framework
// Connects to local SQLite server (index.js) via HTTP POST
// Usage: coworker.run({ ..., options: { adapter: 'sqlite' } })
// ============================================================================

pb._adapters = pb._adapters || {};

pb._adapters.sqlite = {

  // --------------------------------------------------------------------------
  // CONFIG
  // --------------------------------------------------------------------------
  config: {
    url: "http://localhost:3000",
    defaultCollection: "item",   // table name
  },

  // --------------------------------------------------------------------------
  // UNIVERSAL ENTRY POINT
  // Called by coworker._db(run_doc)
  // --------------------------------------------------------------------------
  async execute(run_doc) {
    const op = run_doc.operation?.toLowerCase();

    switch (op) {
      case "select":
      case "takeone":
        return await this._select(run_doc);

      case "create":
        return await this._create(run_doc);

      case "update":
        return await this._update(run_doc);

      case "delete":
        return await this._delete(run_doc);

      default:
        throw new Error(`SQLite adapter: unsupported operation "${op}"`);
    }
  },

  // --------------------------------------------------------------------------
  // SELECT
  // --------------------------------------------------------------------------
  async _select(run_doc) {
    const { query = {}, options = {} } = run_doc;
    const { where, orderBy, take, skip } = query;

    const filter = run_doc._pbFilter || this._buildFilter(run_doc);
    const sort   = this._buildSort(orderBy);

    const { sql, params } = this._buildSelectSQL(filter, sort, take, skip);

    const rows = await this._sql(sql, params);
    const data = rows.map(r => this._deserializeRow(r));

    // total count for pagination
    let total = data.length;
    if (take !== undefined) {
      const countResult = await this._sql(
        `SELECT COUNT(*) as count FROM ${this.config.defaultCollection}${filter ? ` WHERE ${filter.sql}` : ''}`,
        filter ? filter.params : []
      );
      total = countResult[0]?.count ?? data.length;
    }

    const page       = skip && take ? Math.floor(skip / take) + 1 : 1;
    const totalPages = take ? Math.ceil(total / take) : 1;

    return {
      data,
      meta: {
        total,
        page,
        pageSize: take || total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  },

  // --------------------------------------------------------------------------
  // CREATE
  // --------------------------------------------------------------------------
  async _create(run_doc) {
    const inputData = run_doc.input?.data || run_doc.input;

    const name      = inputData.name     || this._generateName(run_doc.target_doctype);
    const doctype   = inputData.doctype  || run_doc.target_doctype;
    const docstatus = inputData.docstatus ?? 0;
    const owner     = JSON.stringify(inputData.owner     || []);
    const allowed   = JSON.stringify(inputData._allowed  || []);
    const allowedR  = JSON.stringify(inputData._allowed_read || []);

    // everything else goes into data JSON
    const dataFields = this._extractDataFields(inputData);
    const dataJson   = JSON.stringify(dataFields);

    const sql = `
      INSERT INTO ${this.config.defaultCollection}
        (id, name, doctype, docstatus, data, owner, _allowed, _allowed_read)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this._sql(sql, [name, name, doctype, docstatus, dataJson, owner, allowed, allowedR]);

    // return created record
    const rows = await this._sql(
      `SELECT * FROM ${this.config.defaultCollection} WHERE name = ?`,
      [name]
    );

    const record = this._deserializeRow(rows[0]);

    return {
      data: record,
      meta: { operation: "create", id: name, name },
    };
  },

  // --------------------------------------------------------------------------
  // UPDATE
  // --------------------------------------------------------------------------
  async _update(run_doc) {
    const { query = {}, input } = run_doc;
    const inputData = input?.data || input;
    const filter    = run_doc._pbFilter || this._buildFilter(run_doc);

    // fetch existing rows first
    const { sql: selSql, params: selParams } = this._buildSelectSQL(filter);
    const existingRows = await this._sql(selSql, selParams);

    if (existingRows.length === 0) {
      return { data: [], meta: { operation: "update", updated: 0 } };
    }

    const updated = [];

    for (const row of existingRows) {
      const existing    = this._deserializeRow(row);
      const mergedData  = { ...existing, ...inputData };
      const dataFields  = this._extractDataFields(mergedData);

      const setClauses  = ["data = ?", "updated = CURRENT_TIMESTAMP"];
      const setParams   = [JSON.stringify(dataFields)];

      // update top-level columns if present in input
      if ("docstatus" in inputData) { setClauses.push("docstatus = ?"); setParams.push(inputData.docstatus); }
      if ("owner" in inputData)     { setClauses.push("owner = ?");     setParams.push(JSON.stringify(inputData.owner)); }
      if ("_allowed" in inputData)  { setClauses.push("_allowed = ?");  setParams.push(JSON.stringify(inputData._allowed)); }
      if ("_allowed_read" in inputData) { setClauses.push("_allowed_read = ?"); setParams.push(JSON.stringify(inputData._allowed_read)); }

      await this._sql(
        `UPDATE ${this.config.defaultCollection} SET ${setClauses.join(", ")} WHERE name = ?`,
        [...setParams, row.name]
      );

      const updatedRows = await this._sql(
        `SELECT * FROM ${this.config.defaultCollection} WHERE name = ?`,
        [row.name]
      );
      updated.push(this._deserializeRow(updatedRows[0]));
    }

    return {
      data: updated,
      meta: { operation: "update", updated: updated.length },
    };
  },

  // --------------------------------------------------------------------------
  // DELETE
  // --------------------------------------------------------------------------
  async _delete(run_doc) {
    const filter = run_doc._pbFilter || this._buildFilter(run_doc);

    const { sql: selSql, params: selParams } = this._buildSelectSQL(filter);
    const rows = await this._sql(selSql, selParams);

    if (rows.length === 0) {
      return { data: [], meta: { operation: "delete", deleted: 0 } };
    }

    for (const row of rows) {
      await this._sql(
        `DELETE FROM ${this.config.defaultCollection} WHERE name = ?`,
        [row.name]
      );
    }

    return {
      data: [],
      meta: { operation: "delete", deleted: rows.length },
    };
  },

  // --------------------------------------------------------------------------
  // SQL BUILDER
  // --------------------------------------------------------------------------
  _buildSelectSQL(filter, sort, take, skip) {
    let sql    = `SELECT * FROM ${this.config.defaultCollection}`;
    const params = [];

    if (filter) {
      sql += ` WHERE ${filter.sql}`;
      params.push(...filter.params);
    }

    if (sort) {
      sql += ` ORDER BY ${sort}`;
    }

    if (take !== undefined) {
      sql += ` LIMIT ?`;
      params.push(take);
      if (skip !== undefined) {
        sql += ` OFFSET ?`;
        params.push(skip);
      }
    }

    return { sql, params };
  },

  // --------------------------------------------------------------------------
  // FILTER: PocketBase string → SQLite WHERE
  // Input:  `doctype = "Item" && (status = "active" || age > 30)`
  // Output: { sql: "doctype = ? AND (json_extract(data,'$.status') = ? OR ...)", params: [...] }
  // --------------------------------------------------------------------------
  _buildFilter(run_doc) {
    const { source_doctype, query = {} } = run_doc;
    const { where } = query;

    // If _pbFilter already set as string (from _buildPrismaWhere), parse it
    const filterStr = run_doc._pbFilterStr ||
      (source_doctype ? `doctype = "${source_doctype}"` : null);

    if (!filterStr && !where) return null;

    // Merge doctype filter with where if needed
    let fullFilter = filterStr || "";
    if (where && typeof where === "object") {
      // This path: raw where object passed directly
      const whereStr = this._whereObjectToString(where);
      if (whereStr) {
        fullFilter = fullFilter
          ? `${fullFilter} && (${whereStr})`
          : whereStr;
      }
    }

    return fullFilter ? this._parsePBFilter(fullFilter) : null;
  },

  // Parse PocketBase filter string into { sql, params }
  _parsePBFilter(filterStr) {
    const params = [];

    // Tokenize respecting parentheses
    let sql = filterStr
      // logical operators
      .replace(/\s*&&\s*/g, " AND ")
      .replace(/\s*\|\|\s*/g, " OR ")
      .replace(/!\s*\(/g, "NOT (");

    // Replace field comparisons
    sql = sql.replace(
      /([a-zA-Z_][a-zA-Z0-9_.]*)\s*(=|!=|>=|<=|>|<|~)\s*("([^"]*)"|'([^']*)'|([^\s)&|]+))/g,
      (match, field, op, _raw, dq, sq, bare) => {
        const value = dq !== undefined ? dq : sq !== undefined ? sq : bare;
        const isNull = value === "null";

        const col = this._fieldToSQL(field);

        if (isNull) {
          return op === "=" ? `${col} IS NULL` : `${col} IS NOT NULL`;
        }

        // ~ means LIKE/regex → use LIKE for contains
        if (op === "~") {
          params.push(`%${value}%`);
          return `${col} LIKE ?`;
        }

        const sqlOp = op === "!=" ? "!=" : op;
        params.push(this._coerceValue(value));
        return `${col} ${sqlOp} ?`;
      }
    );

    return { sql, params };
  },

  // Map field names to SQL column or json_extract
  _fieldToSQL(field) {
    // Top-level columns
    const topLevel = ["name", "doctype", "docstatus", "owner", "_allowed", "_allowed_read", "created", "updated", "id"];
    if (topLevel.includes(field)) return field;

    // data.fieldName → json_extract
    if (field.startsWith("data.")) {
      const key = field.slice(5);
      return `json_extract(data, '$.${key}')`;
    }

    // bare field that's not top-level → assume it's in data
    return `json_extract(data, '$.${field}')`;
  },

  _coerceValue(value) {
    if (value === "true")  return 1;
    if (value === "false") return 0;
    const n = Number(value);
    return isNaN(n) ? value : n;
  },

  // --------------------------------------------------------------------------
  // SORT: PocketBase sort string → SQL ORDER BY
  // Input:  "-created,+name"
  // Output: "created DESC, name ASC"
  // --------------------------------------------------------------------------
  _buildSort(orderBy) {
    if (!orderBy) return null;

    // Already a PB sort string like "-created,name"
    if (typeof orderBy === "string") {
      return orderBy.split(",").map(s => {
        s = s.trim();
        const dir  = s[0] === "-" ? "DESC" : "ASC";
        const field = s.replace(/^[+-]/, "").replace(/^data\./, "");
        return `${this._fieldToSQL(field)} ${dir}`;
      }).join(", ");
    }

    // Prisma array: [{ created: 'desc' }]
    if (Array.isArray(orderBy)) {
      return orderBy.map(obj => {
        const [field, dir] = Object.entries(obj)[0];
        return `${this._fieldToSQL(field)} ${dir.toUpperCase()}`;
      }).join(", ");
    }

    // Prisma object: { created: 'desc' }
    return Object.entries(orderBy).map(([field, dir]) =>
      `${this._fieldToSQL(field)} ${dir.toUpperCase()}`
    ).join(", ");
  },

  // --------------------------------------------------------------------------
  // SERIALIZATION
  // --------------------------------------------------------------------------

  // Top-level columns — NOT stored in data JSON
  _topLevelFields: new Set(["id", "name", "doctype", "docstatus", "data", "owner", "_allowed", "_allowed_read", "created", "updated"]),

  _extractDataFields(inputData) {
    const data = {};
    for (const [k, v] of Object.entries(inputData)) {
      if (!this._topLevelFields.has(k)) {
        data[k] = v;
      }
    }
    return data;
  },

  _deserializeRow(row) {
    if (!row) return null;
    let dataFields = {};
    try { dataFields = JSON.parse(row.data || "{}"); } catch {}

    return {
      name:           row.name,
      doctype:        row.doctype,
      docstatus:      row.docstatus,
      owner:          this._parseJSON(row.owner, []),
      _allowed:       this._parseJSON(row._allowed, []),
      _allowed_read:  this._parseJSON(row._allowed_read, []),
      created:        row.created,
      updated:        row.updated,
      ...dataFields,
    };
  },

  _parseJSON(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
  },

  // --------------------------------------------------------------------------
  // WHERE OBJECT → PB filter string (fallback path)
  // --------------------------------------------------------------------------
  _whereObjectToString(where) {
    const parts = [];
    for (const [k, v] of Object.entries(where)) {
      if (typeof v === "string")  { parts.push(`${k} = "${v}"`); continue; }
      if (typeof v === "number")  { parts.push(`${k} = ${v}`);   continue; }
      if (v === null)             { parts.push(`${k} = null`);   continue; }
    }
    return parts.join(" && ");
  },

  // --------------------------------------------------------------------------
  // HTTP → SQLite server
  // --------------------------------------------------------------------------
  async _sql(query, params = []) {
    const res = await fetch(this.config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, params }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(`SQLite HTTP error: ${err.error || res.statusText}`);
    }

    const results = await res.json();
    // server returns array of results per statement; return first
    return Array.isArray(results[0]) ? results[0] : results;
  },

  // --------------------------------------------------------------------------
  // UTILS
  // --------------------------------------------------------------------------
  _generateName(doctype = "record") {
    const ts     = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${doctype.toLowerCase()}-${ts}-${random}`;
  },
};

// --------------------------------------------------------------------------
// Wire into coworker._db
// --------------------------------------------------------------------------
if (typeof coworker !== "undefined") {
  coworker._db = async function (run_doc) {
    const adapterName = run_doc.options?.adapter || "pocketbase";

    const adapter = pb._adapters[adapterName];
    if (!adapter) throw new Error(`Adapter "${adapterName}" not found`);

    return await adapter.execute(run_doc);
  };

  console.log("✅ SQLite adapter loaded — use options: { adapter: 'sqlite' }");
}