//refactors/todos
// //  use CW-config.js common for client and server
// const PB_TOP = CW._config.topLevelFields; PB_TOP is bad
// user CW-utils.js for common functions like signJWT, verifyJWT, hashPassword, verifyPassword etc
// check if signJWT and verifyJWT doesnt conflict with PB SDK, 


// ============================================================
// worker.js — PocketBase-compatible API Worker over D1
// Mimics PocketBase REST API surface exactly
// Single file — no external dependencies
// ============================================================

// ── JWT ───────────────────────────────────────────────────────

const b64url = s => btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
const b64dec  = s => atob(s.replace(/-/g,'+').replace(/_/g,'/'))

async function signJWT(payload, secret, expSeconds = 604800) {
  const header = b64url(JSON.stringify({ alg:'HS256', typ:'JWT' }))
  const body   = b64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now()/1000) + expSeconds }))
  const key    = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
                   { name:'HMAC', hash:'SHA-256' }, false, ['sign'])
  const sig    = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`))
  return `${header}.${body}.${b64url(String.fromCharCode(...new Uint8Array(sig)))}`
}

async function verifyJWT(token, secret) {
  if (!token) throw new Error('Missing token')
  const [header, body, sig] = token.split('.')
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
                { name:'HMAC', hash:'SHA-256' }, false, ['verify'])
  const valid = await crypto.subtle.verify('HMAC', key,
    Uint8Array.from(b64dec(sig), c => c.charCodeAt(0)),
    new TextEncoder().encode(`${header}.${body}`))
  if (!valid) throw new Error('Invalid token')
  const payload = JSON.parse(b64dec(body))
  if (payload.exp < Math.floor(Date.now()/1000)) throw new Error('Token expired')
  return payload
}

function makeJWTPayload(user) {
  return {
    id:           user.id,
    collectionId: '_pb_users_auth_',
    type:         'auth',
    refreshable:  true,
  }
}

// ── Password ──────────────────────────────────────────────────

async function hashPassword(password) {
  const enc  = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key  = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const hash = await crypto.subtle.deriveBits(
    { name:'PBKDF2', salt, iterations:100000, hash:'SHA-256' }, key, 256)
  return b64url(String.fromCharCode(...salt)) + '.' + b64url(String.fromCharCode(...new Uint8Array(hash)))
}

async function verifyPassword(password, stored) {
  const [saltB64, hashB64] = stored.split('.')
  const salt = Uint8Array.from(b64dec(saltB64), c => c.charCodeAt(0))
  const enc  = new TextEncoder()
  const key  = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const hash = await crypto.subtle.deriveBits(
    { name:'PBKDF2', salt, iterations:100000, hash:'SHA-256' }, key, 256)
  return b64url(String.fromCharCode(...new Uint8Array(hash))) === hashB64
}

// ── fexpr → SQL ───────────────────────────────────────────────

const PB_TOP = new Set(['id','name','doctype','owner','domain','email',
                        '_allowed','_allowed_read','created','updated'])

function fieldSQL(f) {
  if (f === 'name')   return 'id'
  if (PB_TOP.has(f))  return f
  if (f.startsWith('@')) return '1' // skip @request etc
  return `json_extract(data,'$.${f}')`
}

function valSQL(type, val) {
  if (val === 'null')  return 'NULL'
  if (val === 'true')  return '1'
  if (val === 'false') return '0'
  if (type === 'number') return val
  return `'${val.replace(/'/g,"''")}'`
}

function pbFilterToSQL(filter) {
  if (!filter?.trim()) return '1=1'

  // tokenize
  const tokens = []
  let i = 0
  while (i < filter.length) {
    if (/\s/.test(filter[i]))  { i++; continue }
    if (filter[i] === '(')     { tokens.push({ t:'(' }); i++; continue }
    if (filter[i] === ')')     { tokens.push({ t:')' }); i++; continue }
    const join2 = filter.slice(i,i+2)
    if (join2==='&&'||join2==='||') { tokens.push({ t:'join', v:join2 }); i+=2; continue }
    // signs longest first
    const signs = ['?!~','?!=','?<=','?>=','?~','?=','?<','?>','!=','!~','>=','<=','>','<','~','=']
    let sm = false
    for (const s of signs) {
      if (filter.slice(i,i+s.length)===s) { tokens.push({ t:'sign', v:s }); i+=s.length; sm=true; break }
    }
    if (sm) continue
    // quoted text
    if (filter[i]==='"'||filter[i]==="'") {
      const q=filter[i]; let j=i+1; let str=''
      while (j<filter.length) {
        if (filter[j]==='\\'&&j+1<filter.length) { str+=filter[j+1]; j+=2; continue }
        if (filter[j]===q) { j++; break }
        str+=filter[j]; j++
      }
      tokens.push({ t:'text', v:str }); i=j; continue
    }
    // number
    if (/\d/.test(filter[i])||( filter[i]==='-'&&/\d/.test(filter[i+1]||''))) {
      let j=i; if (filter[j]==='-') j++
      while (j<filter.length&&/[\d.]/.test(filter[j])) j++
      tokens.push({ t:'number', v:filter.slice(i,j) }); i=j; continue
    }
    // identifier
    if (/[\w@]/.test(filter[i])) {
      let j=i
      while (j<filter.length&&/[\w.@:-]/.test(filter[j])) j++
      const v=filter.slice(i,j)
      tokens.push({ t: v==='null'||v==='true'||v==='false' ? 'text':'ident', v })
      i=j; continue
    }
    i++
  }

  // parse → SQL
  let pos = 0
  const peek    = () => tokens[pos]
  const consume = () => tokens[pos++]

  function exprSQL(sign, field, valTok) {
    const f  = fieldSQL(field)
    const v  = valSQL(valTok.t, valTok.v)
    const rv = valTok.v.replace(/'/g,"''")
    switch (sign) {
      case '=':   return `${f} = ${v}`
      case '!=':  return `${f} != ${v}`
      case '>':   return `${f} > ${v}`
      case '>=':  return `${f} >= ${v}`
      case '<':   return `${f} < ${v}`
      case '<=':  return `${f} <= ${v}`
      case '~':   return `${f} LIKE '%${rv}%'`
      case '!~':  return `${f} NOT LIKE '%${rv}%'`
      case '?~':  return `EXISTS(SELECT 1 FROM json_each(${f}) _j WHERE _j.value='${rv}')`
      case '?!~': return `NOT EXISTS(SELECT 1 FROM json_each(${f}) _j WHERE _j.value='${rv}')`
      case '?=':  return `EXISTS(SELECT 1 FROM json_each(${f}) _j WHERE _j.value=${v})`
      case '?!=': return `NOT EXISTS(SELECT 1 FROM json_each(${f}) _j WHERE _j.value=${v})`
      default:    return '1=1'
    }
  }

  function parseGroup() {
    const parts = []
    while (peek() && peek().t !== ')') {
      let join = 'AND'
      if (peek()?.t === 'join') join = consume().v === '||' ? 'OR' : 'AND'
      let sql
      if (peek()?.t === '(') {
        consume()
        sql = `(${parseGroup()})`
        consume() // )
      } else {
        const field = consume()?.v
        const sign  = consume()?.v
        const val   = consume()
        sql = exprSQL(sign, field, val)
      }
      parts.push(parts.length ? `${join} ${sql}` : sql)
    }
    return parts.join(' ')
  }

  try { return parseGroup() } catch { return '1=1' }
}

// ── ACL ───────────────────────────────────────────────────────

function aclWhere(user) {
  if (!user) return `_allowed_read LIKE '%roleispublicxxx%'`
  const id   = user.id.replace(/'/g,"''")
  return `(
    _allowed_read LIKE '%roleispublicxxx%'
    OR id = '${id}'
    OR owner = '${id}'
    OR _allowed LIKE '%${id}%'
    OR _allowed_read LIKE '%${id}%'
  )`
}

function aclWriteWhere(user) {
  if (!user) return '0=1'
  const id = user.id.replace(/'/g,"''")
  return `(owner='${id}' OR _allowed LIKE '%${id}%')`
}

// ── PB response shapes ────────────────────────────────────────

function recordShape(row) {
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {})
  return {
    id:             row.id,
    collectionId:   'item',
    collectionName: 'item',
    created:        row.created || data.created || '',
    updated:        row.updated || data.modified || '',
    ...data,
    // top-level overrides
    doctype:        row.doctype,
    owner:          row.owner,
    _allowed:       JSON.parse(row._allowed || '[]'),
    _allowed_read:  JSON.parse(row._allowed_read || '[]'),
  }
}

function userShape(row) {
  const rec = recordShape(row)
  // strip sensitive fields — same as PB
  delete rec.password_hash
  delete rec.verification_token
  delete rec.reset_token
  delete rec.token_version
  return rec
}

function listShape(items, total, page, perPage) {
  return { page, perPage, totalItems: total, totalPages: Math.ceil(total/perPage), items }
}

function authShape(token, record) {
  return { token, record }
}

// ── CORS ──────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const json  = (data, status=200) => new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type':'application/json' } })
const err   = (msg,  status=400) => json({ code: status, message: msg, data: {} }, status)

// ── Auth handler ──────────────────────────────────────────────

async function handleAuth(collection, action, req, env) {
  const body = req.method === 'POST' ? await req.json().catch(()=>({})) : {}
  const token = req.headers.get('Authorization') || ''

  // ── auth-with-password ──────────────────────────────────────
  if (action === 'auth-with-password') {
    const { identity, password } = body
    if (!identity || !password) return err('identity and password required')

    const row = await env.DB.prepare(
      `SELECT * FROM item WHERE doctype='User' AND (email=?1 OR id=?1)`
    ).bind(identity).first()

    if (!row) return err('Failed to authenticate', 400)

    const data = JSON.parse(row.data || '{}')
    const ok   = await verifyPassword(password, data.password_hash || '')
    if (!ok) return err('Failed to authenticate', 400)

    const jwtToken = await signJWT(makeJWTPayload(row), env.JWT_SECRET)
    return json(authShape(jwtToken, userShape(row)))
  }

  // ── auth-refresh ────────────────────────────────────────────
  if (action === 'auth-refresh') {
    let payload
    try { payload = await verifyJWT(token, env.JWT_SECRET) }
    catch { return err('Invalid token', 401) }

    const row = await env.DB.prepare(`SELECT * FROM item WHERE id=? AND doctype='User'`)
                  .bind(payload.id).first()
    if (!row) return err('Record not found', 404)

    const jwtToken = await signJWT(makeJWTPayload(row), env.JWT_SECRET)
    return json(authShape(jwtToken, userShape(row)))
  }

  // ── request-verification ────────────────────────────────────
  if (action === 'request-verification') {
    const { email } = body
    const row = await env.DB.prepare(`SELECT * FROM item WHERE doctype='User' AND email=?`).bind(email).first()
    if (!row) return json({}) // PB returns 204 even if not found

    const verToken = crypto.randomUUID()
    await env.DB.prepare(`UPDATE item SET data=json_patch(data,json(?)) WHERE id=?`)
      .bind(JSON.stringify({ verification_token: verToken }), row.id).run()

    await globalThis.Adapters?.email?.sendVerification?.({ email, token: verToken, userId: row.id })
    return json({})
  }

  // ── confirm-verification ────────────────────────────────────
  if (action === 'confirm-verification') {
    const { token: verToken } = body
    const row = await env.DB.prepare(
      `SELECT * FROM item WHERE doctype='User' AND json_extract(data,'$.verification_token')=?`
    ).bind(verToken).first()
    if (!row) return err('Invalid token', 400)

    await env.DB.prepare(`UPDATE item SET data=json_patch(data,json(?)) WHERE id=?`)
      .bind(JSON.stringify({ verified: true, verification_token: null }), row.id).run()

    const jwtToken = await signJWT(makeJWTPayload(row), env.JWT_SECRET)
    return json(authShape(jwtToken, userShape(row)))
  }

  // ── request-password-reset ──────────────────────────────────
  if (action === 'request-password-reset') {
    const { email } = body
    const row = await env.DB.prepare(`SELECT * FROM item WHERE doctype='User' AND email=?`).bind(email).first()
    if (!row) return json({})

    const resetToken = crypto.randomUUID()
    await env.DB.prepare(`UPDATE item SET data=json_patch(data,json(?)) WHERE id=?`)
      .bind(JSON.stringify({ reset_token: resetToken }), row.id).run()

    await globalThis.Adapters?.email?.sendPasswordReset?.({ email, token: resetToken })
    return json({})
  }

  // ── confirm-password-reset ──────────────────────────────────
  if (action === 'confirm-password-reset') {
    const { token: resetToken, password, passwordConfirm } = body
    if (password !== passwordConfirm) return err('Passwords do not match')

    const row = await env.DB.prepare(
      `SELECT * FROM item WHERE doctype='User' AND json_extract(data,'$.reset_token')=?`
    ).bind(resetToken).first()
    if (!row) return err('Invalid token', 400)

    const hash = await hashPassword(password)
    await env.DB.prepare(`UPDATE item SET data=json_patch(data,json(?)) WHERE id=?`)
      .bind(JSON.stringify({ password_hash: hash, reset_token: null }), row.id).run()

    return json({})
  }

  // ── request-otp ─────────────────────────────────────────────
  if (action === 'request-otp') {
    const { email } = body
    const row = await env.DB.prepare(`SELECT * FROM item WHERE doctype='User' AND email=?`).bind(email).first()
    if (!row) return json({ otpId: crypto.randomUUID() }) // PB returns otpId even if not found

    const otp   = Math.floor(100000 + Math.random() * 900000).toString()
    const otpId = crypto.randomUUID()
    await env.DB.prepare(`UPDATE item SET data=json_patch(data,json(?)) WHERE id=?`)
      .bind(JSON.stringify({ otp_code: otp, otp_id: otpId }), row.id).run()

    await globalThis.Adapters?.email?.sendOTP?.({ email, otp })
    return json({ otpId })
  }

  // ── auth-with-otp ───────────────────────────────────────────
  if (action === 'auth-with-otp') {
    const { otpId, password: otp } = body
    const row = await env.DB.prepare(
      `SELECT * FROM item WHERE doctype='User' AND json_extract(data,'$.otp_id')=?`
    ).bind(otpId).first()
    if (!row) return err('Failed to authenticate', 400)

    const data = JSON.parse(row.data || '{}')
    if (data.otp_code !== otp) return err('Failed to authenticate', 400)

    // clear otp
    await env.DB.prepare(`UPDATE item SET data=json_patch(data,json(?)) WHERE id=?`)
      .bind(JSON.stringify({ otp_code: null, otp_id: null }), row.id).run()

    const jwtToken = await signJWT(makeJWTPayload(row), env.JWT_SECRET)
    return json(authShape(jwtToken, userShape(row)))
  }

  return err('Unknown auth action', 404)
}

// ── CRUD handler ──────────────────────────────────────────────

async function handleCRUD(collection, id, req, url, env, user) {
  const method = req.method

  // ── GET list ────────────────────────────────────────────────
  if (method === 'GET' && !id) {
    const filter   = url.searchParams.get('filter')  || ''
    const sort     = url.searchParams.get('sort')    || '-created'
    const page     = parseInt(url.searchParams.get('page')    || '1')
    const perPage  = parseInt(url.searchParams.get('perPage') || '30')
    const skipTotal= url.searchParams.get('skipTotal') === 'true'
    const offset   = (page - 1) * perPage

    const clientSQL = filter ? pbFilterToSQL(filter) : '1=1'
    const acl       = aclWhere(user)
    const WHERE     = `${clientSQL} AND ${acl}`
    const ORDER     = sort.startsWith('-')
      ? `ORDER BY ${sort.slice(1)} DESC`
      : `ORDER BY ${sort} ASC`

    let total = -1
    if (!skipTotal) {
      const ct = await env.DB.prepare(`SELECT COUNT(*) as n FROM item WHERE ${WHERE}`).first()
      total = ct?.n ?? 0
    }

    const rows = await env.DB.prepare(
      `SELECT * FROM item WHERE ${WHERE} ${ORDER} LIMIT ? OFFSET ?`
    ).bind(perPage, offset).all()

    const items = (rows.results || []).map(recordShape)
    return json(listShape(items, total, page, perPage))
  }

  // ── GET single ──────────────────────────────────────────────
  if (method === 'GET' && id) {
    const acl = aclWhere(user)
    const row = await env.DB.prepare(
      `SELECT * FROM item WHERE id=? AND (${acl})`
    ).bind(id).first()
    if (!row) return err('Record not found', 404)
    return json(recordShape(row))
  }

  // ── POST create ─────────────────────────────────────────────
  if (method === 'POST') {
    const body = await req.json()
    const { doctype, owner, _allowed, _allowed_read, domain, email, ...rest } = body
    const recId   = body.id || body.name || crypto.randomUUID()
    const now     = new Date().toISOString()
    const userId  = user?.id || ''

    // strip top-level from data blob
    const { id: _id, name: _name, doctype: _dt, owner: _ow,
            _allowed: _al, _allowed_read: _alr, domain: _dm, email: _em, ...dataFields } = body
    const data = { ...dataFields, id: recId, created: now, modified: now, modified_by: userId }

    await env.DB.prepare(`
      INSERT INTO item (id, doctype, owner, domain, email, _allowed, _allowed_read, created, updated, data)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?8,json(?9))
      ON CONFLICT(id) DO UPDATE SET
        data=json_patch(data,excluded.data), updated=excluded.updated
    `).bind(
      recId,
      doctype || data.doctype || '',
      owner   || userId,
      domain  || '',
      email   || data.email || '',
      JSON.stringify(_allowed || []),
      JSON.stringify(_allowed_read || []),
      now,
      JSON.stringify(data)
    ).run()

    const row = await env.DB.prepare(`SELECT * FROM item WHERE id=?`).bind(recId).first()
    return json(recordShape(row), 200)
  }

  // ── PATCH update ────────────────────────────────────────────
  if (method === 'PATCH' && id) {
    const acl = aclWriteWhere(user)
    const row = await env.DB.prepare(`SELECT * FROM item WHERE id=? AND (${acl})`).bind(id).first()
    if (!row) return err('Record not found', 404)

    const body    = await req.json()
    const now     = new Date().toISOString()
    const userId  = user?.id || ''

    // update top-level columns if present in body
    const updates = []
    const params  = []
    if ('_allowed'      in body) { updates.push('_allowed=?');       params.push(JSON.stringify(body._allowed)) }
    if ('_allowed_read' in body) { updates.push('_allowed_read=?');  params.push(JSON.stringify(body._allowed_read)) }
    if ('owner'         in body) { updates.push('owner=?');          params.push(body.owner) }
    if ('email'         in body) { updates.push('email=?');          params.push(body.email) }

    // merge into data blob
    const { _allowed: _al, _allowed_read: _alr, owner: _ow, email: _em,
            id: _id, name: _nm, doctype: _dt, ...dataFields } = body
    const patch = { ...dataFields, modified: now, modified_by: userId }

    updates.push('data=json_patch(data,json(?))')
    params.push(JSON.stringify(patch))
    updates.push('updated=?')
    params.push(now)
    params.push(id)

    await env.DB.prepare(
      `UPDATE item SET ${updates.join(',')} WHERE id=?`
    ).bind(...params).run()

    const updated = await env.DB.prepare(`SELECT * FROM item WHERE id=?`).bind(id).first()
    return json(recordShape(updated))
  }

  // ── DELETE ──────────────────────────────────────────────────
  if (method === 'DELETE' && id) {
    const acl = aclWriteWhere(user)
    const row = await env.DB.prepare(`SELECT * FROM item WHERE id=? AND (${acl})`).bind(id).first()
    if (!row) return err('Record not found', 404)

    // soft delete — docstatus=2, same as PB adapter
    const now = new Date().toISOString()
    await env.DB.prepare(
      `UPDATE item SET data=json_patch(data,'{"docstatus":2}'), updated=? WHERE id=?`
    ).bind(now, id).run()

    return new Response(null, { status: 204, headers: CORS })
  }

  return err('Method not allowed', 405)
}

// ── Main fetch handler ────────────────────────────────────────

export default {
  async fetch(req, env, ctx) {
    globalThis.env = globalThis.env || env

    const url    = new URL(req.url)
    const path   = url.pathname
    const method = req.method

    if (method === 'OPTIONS') return new Response(null, { headers: CORS })

    // ── auth routes ───────────────────────────────────────────
    // POST /api/collections/users/auth-with-password etc
    const authMatch = path.match(/^\/api\/collections\/\w+\/([a-z-]+)$/)
    if (authMatch && method === 'POST' && !authMatch[1].startsWith('records')) {
      return handleAuth('users', authMatch[1], req, env)
    }

    // ── crud routes ───────────────────────────────────────────
    // /api/collections/:collection/records/:id?
    const crudMatch = path.match(/^\/api\/collections\/(\w+)\/records\/?(\w*)$/)
    if (crudMatch) {
      const collection = crudMatch[1]
      const id         = crudMatch[2] || ''

      // verify JWT for non-public requests
      const token = req.headers.get('Authorization') || ''
      let user = null
      try { user = await verifyJWT(token, env.JWT_SECRET) } catch {}

      return handleCRUD(collection, id, req, url, env, user)
    }

    return new Response('not found', { status: 404, headers: CORS })
  }
}
