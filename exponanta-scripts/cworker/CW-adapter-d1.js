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
  // RECORD HELPERS
  // ============================================================

  function _splitRecord(doc) {
    const top  = {}
    const data = {}
    for (const [k, v] of Object.entries(doc)) {
      if (
        CW._config.topLevelFields.has(k) ||
        /^[\w]+[+-]$|^[+-][\w]+$/.test(k) ||
        v instanceof File
      ) {
        top[k] = Array.isArray(v) || (v && typeof v === 'object')
          ? JSON.stringify(v)
          : v
      } else {
        data[k] = v
      }
    }
    return { top, data }
  }

  function _mergeRecord(rec) {
    const raw = rec.data
    const doc = Object.assign(
      {},
      typeof raw === 'string' ? JSON.parse(raw || '{}') : raw || {}
    )
    for (const k of CW._config.topLevelFields) {
      if (!(k in rec)) continue
      const v = rec[k]
      if (typeof v === 'string' && (v.startsWith('[') || v.startsWith('{'))) {
        try { doc[k] = JSON.parse(v) } catch { doc[k] = v }
      } else {
        doc[k] = v
      }
    }
    return doc
  }

  // ============================================================
  // TRANSPORT — browser → Worker → D1
  // ============================================================

  const _post = async (run_doc) => {
    const res = await fetch(cfg().hub.url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': globalThis.currentUser?.token || '',
      },
      body: JSON.stringify(run_doc),
    })
    Object.assign(run_doc, await res.json())
  }

  // ============================================================
  // RecordFieldResolver
  // ============================================================

  function RecordFieldResolver(run_doc) {
    const params = []

    function resolveField(key) {
      return cfg().topLevelFields.has(key)
        ? `item.${key}`
        : `json_extract(item.data, '$.${key}')`
    }

    function resolveOperator(field, op, value) {
      switch (op) {
        case 'equals':  params.push(value);              return `${field} = ?`
        case 'contains':params.push(`%${value}%`);       return `${field} LIKE ?`
        case 'gt':      params.push(value);              return `${field} > ?`
        case 'gte':     params.push(value);              return `${field} >= ?`
        case 'lt':      params.push(value);              return `${field} < ?`
        case 'lte':     params.push(value);              return `${field} <= ?`
        case 'not':     params.push(value);              return `${field} != ?`
        case 'in':
          if (Array.isArray(value) && value.length) {
            value.forEach(v => params.push(v))
            return `${field} IN (${value.map(() => '?').join(',')})`
          }
          return null
        default: return null
      }
    }

    function resolve(where) {
      if (!where || typeof where !== 'object') return ''
      const parts = []
      for (const [key, value] of Object.entries(where)) {
        if (key === 'OR') {
          const p = value.map(w => resolve(w)).filter(Boolean)
          if (p.length) parts.push(`(${p.join(' OR ')})`)
          continue
        }
        if (key === 'AND') {
          const p = value.map(w => resolve(w)).filter(Boolean)
          if (p.length) parts.push(`(${p.join(' AND ')})`)
          continue
        }
        if (key === 'NOT') {
          const p = resolve(value)
          if (p) parts.push(`NOT (${p})`)
          continue
        }
        const field = resolveField(key)
        if (value === null || value === undefined) {
          parts.push(`${field} IS NULL`)
        } else if (typeof value === 'string') {
          params.push(value); parts.push(`${field} = ?`)
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          params.push(value); parts.push(`${field} = ?`)
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          for (const [op, opValue] of Object.entries(value)) {
            const expr = resolveOperator(field, op, opValue)
            if (expr) parts.push(expr)
          }
        }
      }
      return parts.join(' AND ')
    }

    return { resolve, params }
  }

  // ============================================================
  // _buildFilter / _buildSort / _buildLimit
  // ============================================================

  function _buildFilter(run_doc) {
    const doctype  = run_doc.target_doctype ?? run_doc.source_doctype
    const resolver = RecordFieldResolver(run_doc)
    const parts    = []
    const params   = []
    if (doctype) { parts.push(`item.doctype = ?`); params.push(doctype) }
    const where = run_doc.query?.where
    if (where) {
      const clause = resolver.resolve(where)
      if (clause) parts.push(`(${clause})`)
      params.push(...resolver.params)
    }
    return { clause: parts.join(' AND '), params }
  }

  function _buildSort(run_doc) {
    const sort = run_doc.query?.sort
    if (!sort) return 'item.modified DESC'
    if (typeof sort === 'string') return sort
    return Object.entries(sort).map(([f, dir]) => {
      const col = cfg().topLevelFields.has(f)
        ? `item.${f}`
        : `json_extract(item.data, '$.${f}')`
      return `${col} ${dir === 'desc' ? 'DESC' : 'ASC'}`
    }).join(', ')
  }

  function _buildLimit(run_doc) {
    const perPage = run_doc.query?.perPage
    const page    = run_doc.query?.page || 1
    if (!perPage) return { sql: '', params: [] }
    return { sql: 'LIMIT ? OFFSET ?', params: [perPage, (page - 1) * perPage] }
  }

  // ============================================================
  // AUTH HELPERS — User only
  // ============================================================

  async function _pbkdf2(password) {
    return pbkdf2(password)  // globalThis.pbkdf2 from CW-utils.js
  }

  function _buildUserPayload(doc) {
    // in_local_view fields
    const schema  = CW.Schema?.User
    const fields  = (schema?.fields || [])
      .filter(f => f.in_local_view)
      .map(f => f.fieldname)
    const payload = Object.fromEntries(
      fields.filter(k => k in doc).map(k => [k, doc[k]])
    )
    // resolve FSM dims into JWT
    const stateDef = CW._getStateDef('User')
    const state    = (typeof doc._state === 'string'
      ? tryParseJSON(doc._state)
      : doc._state) || {}
    for (const [dim] of Object.entries(stateDef)) {
      if (dim in state) payload[dim] = state[dim]
    }
    return payload
  }

  async function _issueToken(doc, run_doc) {
    const payload = _buildUserPayload(doc)
    const token   = await signJWT(payload, globalThis.env.JWT_SECRET)
    run_doc.user  = { ...payload, token }
  }

  // ============================================================
  // SELECT
  // ============================================================

  async function select(run_doc) {
    if (!globalThis.env?.DB) { await _post(run_doc); return }

    const doctype    = run_doc.target_doctype ?? run_doc.source_doctype
    const { clause, params: filterParams } = _buildFilter(run_doc)
    const aclParams  = cfg().sql.aclParams(run_doc.user)
    const sort       = _buildSort(run_doc)
    const limit      = _buildLimit(run_doc)
    const baseSQL    = CW.Schema?.[doctype]?.listSQL?.(cfg()) || cfg().sql.listSQL(cfg())

    const sql = `
      ${baseSQL}
      ${clause ? `AND (${clause})` : ''}
      ORDER BY ${sort}
      ${limit.sql}
    `.trim()

    try {
      const rows = await globalThis.env.DB.prepare(sql)
        .bind(...aclParams, ...filterParams, ...limit.params)
        .all()
      run_doc.target  = {
        data: rows.results.map(_mergeRecord),
        meta: { total: rows.results.length },
      }
      run_doc.success = true
    } catch (err) {
      run_doc.error = err.message
    }
  }

  // ============================================================
  // CREATE
  // ============================================================

  async function _d1Insert(run_doc) {
    const doc = run_doc.target?.data?.[0]
    if (!doc) { run_doc.error = '400 create: no target document'; return }

    const { top, data } = _splitRecord(doc)
    const topKeys = Object.keys(top)
    const topVals = Object.values(top)

    const sql = `
      INSERT INTO ${cfg().collection}
      (${topKeys.join(', ')}, data)
      VALUES (${topKeys.map(() => '?').join(', ')}, ?)
    `
    try {
      await globalThis.env.DB.prepare(sql)
        .bind(...topVals, JSON.stringify(data))
        .run()
      run_doc.target  = { data: [doc], meta: { name: doc.name } }
      run_doc.success = true
    } catch (err) {
      run_doc.error = err.message
    }
  }

  async function createUser(run_doc) {
    const doc = run_doc.target?.data?.[0]
    if (!doc) { run_doc.error = '400 createUser: no target document'; return }

    // step 1 — userFields onCreate hooks
    // (password_hash, owner, _allowed, _allowed_read)
    for (const f of CW._config.userFields || []) {
      if (f.onCreate) await f.onCreate(run_doc)
    }

    // step 2 — initialize _state with FSM defaults
    const stateDef = CW._getStateDef('User')
    if (!doc._state) doc._state = {}
    for (const [dim, dimDef] of Object.entries(stateDef)) {
      if (!(dim in doc._state)) {
        doc._state[dim] = dimDef.default ?? dimDef.values?.[0] ?? null
      }
    }

    // step 3 — D1 insert
    await _d1Insert(run_doc)
    if (run_doc.error) return

    // step 4 — issue JWT
    await _issueToken(doc, run_doc)
  }

  async function create(run_doc) {
    if (!globalThis.env?.DB) {
      await _post(run_doc)
      // client branch — store currentUser after User create
      if (run_doc.target_doctype === 'User' && run_doc.success && run_doc.user?.token) {
        localStorage.setItem('currentUser', JSON.stringify(run_doc.user))
        globalThis.currentUser = run_doc.user
      }
      return
    }
    if (run_doc.target_doctype === 'User') return createUser(run_doc)
    await _d1Insert(run_doc)
  }

  // ============================================================
  // UPDATE
  // ============================================================

  async function _d1Update(run_doc) {
    const doc  = run_doc.target?.data?.[0]
    const name = doc?.name || run_doc.query?.where?.name
    if (!name) { run_doc.error = '400 update: no record name'; return }

    const { top, data } = _splitRecord(doc)
    const sets    = Object.keys(top).map(k => `${k} = ?`)
    const vals    = Object.values(top)

    const sql = `
      UPDATE ${cfg().collection}
      SET ${sets.join(', ')}, data = ?
      WHERE name = ?
    `
    try {
      await globalThis.env.DB.prepare(sql)
        .bind(...vals, JSON.stringify(data), name)
        .run()
      run_doc.target  = { data: [doc], meta: { name } }
      run_doc.success = true
    } catch (err) {
      run_doc.error = err.message
    }
  }

  async function updateUser(run_doc) {
    const doc = run_doc.target?.data?.[0]
    if (!doc) { run_doc.error = '400 updateUser: no target document'; return }

    // userFields onUpdate hooks
    for (const f of CW._config.userFields || []) {
      if (f.onUpdate) await f.onUpdate(run_doc)
    }

    await _d1Update(run_doc)
    if (run_doc.error) return

    // re-issue JWT with updated payload
    await _issueToken(doc, run_doc)
  }

  async function update(run_doc) {
    if (!globalThis.env?.DB) {
      await _post(run_doc)
      // client branch — refresh currentUser if User updated
      if (run_doc.target_doctype === 'User' && run_doc.success && run_doc.user?.token) {
        localStorage.setItem('currentUser', JSON.stringify(run_doc.user))
        globalThis.currentUser = run_doc.user
      }
      return
    }
    if (run_doc.target_doctype === 'User') return updateUser(run_doc)
    await _d1Update(run_doc)
  }

  // ============================================================
  // DELETE
  // ============================================================

  async function _delete(run_doc) {
    if (!globalThis.env?.DB) { await _post(run_doc); return }

    const name = run_doc.target?.data?.[0]?.name || run_doc.query?.where?.name
    if (!name) { run_doc.error = '400 delete: no record name'; return }

    try {
      await globalThis.env.DB.prepare(
        `DELETE FROM ${cfg().collection} WHERE name = ?`
      ).bind(name).run()
      run_doc.success = true
    } catch (err) {
      run_doc.error = err.message
    }
  }

  // ============================================================
  // AUTH OPERATIONS
  // ============================================================

  async function login(run_doc) {
    if (!globalThis.env?.DB) {
      await _post(run_doc)
      if (run_doc.success && run_doc.user?.token) {
        localStorage.setItem('currentUser', JSON.stringify(run_doc.user))
        globalThis.currentUser = run_doc.user
      }
      return
    }

    const { email, password } = run_doc.target?.data?.[0] || {}
    if (!email || !password) { run_doc.error = '400 email and password required'; return }

    // fetch User by email
    const row = await globalThis.env.DB
      .prepare(`SELECT * FROM item WHERE doctype = 'User' AND json_extract(data, '$.email') = ? LIMIT 1`)
      .bind(email)
      .first()
    if (!row) { run_doc.error = '401 invalid credentials'; return }

    const doc = _mergeRecord(row)

    // verify password
    const hash = await pbkdf2(password)
    if (hash !== doc.password_hash) { run_doc.error = '401 invalid credentials'; return }

    // check status via FSM
    const state  = (typeof doc._state === 'string' ? tryParseJSON(doc._state) : doc._state) || {}
    const status = state.status
    if (status !== 'Active') {
      run_doc.error = `403 account ${status?.toLowerCase() ?? 'not active'}`
      return
    }

    run_doc.target  = { data: [doc] }
    await _issueToken(doc, run_doc)
    run_doc.success = true
  }


  async function logout(run_doc) {
  if (!globalThis.env?.DB) {
    await _post(run_doc)
    // client branch — clear currentUser
    localStorage.removeItem('currentUser')
    globalThis.currentUser = null
    run_doc.success = true
    return
  }
  // Worker branch — future: insert tokenKey into revoked_tokens
  run_doc.success = true
}

  // ============================================================
  // ADAPTER SURFACE
  // ============================================================

  globalThis.Adapters      = globalThis.Adapters || {}
  globalThis.Adapters['d1'] = {
    select,
    create,
    update,
    delete:           _delete,
    login,
    logout,
  }

})();
