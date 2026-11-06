// ============================================================
// node-setup.js — Node test context for CW (Node 22+)
//
//   const { setup, resetDb, db, asUser } = require('./node-setup.js')
//   await setup()                       // loads the framework from the hub
//   CW_HUB=./src/ node node-tests.js    // or from a local folder (ends with / or \)
//
// - loads remote-boot.js, then calls its CW_loadFramework(), so the file
//   list and load order come from remote-boot.js — nothing is listed here
// - env.DB is an in-memory SQLite stand-in for D1, created from the real
//   `item` table DDL; the adapter uses env.DB directly when it exists
// - nothing here ever touches your real D1 database
// ============================================================
'use strict'

const fs = require('node:fs')
const vm = require('node:vm')
const { DatabaseSync } = require('node:sqlite')

const HUB = process.env.CW_HUB || 'https://hub-cf.i771468.workers.dev/'
const DOMAIN = 'hub-cf.i771468.workers.dev'

// real DDL (hub file "CREATE TABLE item (.txt")
const DDL = `
CREATE TABLE item (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  doctype       TEXT NOT NULL,
  docstatus     INTEGER DEFAULT 0,
  title         TEXT DEFAULT '',
  domain        TEXT DEFAULT '',
  owner         TEXT DEFAULT '',
  _allowed      TEXT DEFAULT '[]',
  _allowed_read TEXT DEFAULT '[]',
  created       INTEGER,
  modified      INTEGER,
  files         TEXT DEFAULT '[]',
  data          TEXT DEFAULT '{}'
);
CREATE VIEW item_users AS
  SELECT u.id, j.value AS role_id FROM item u, json_each(u._allowed_read) j WHERE u.doctype='User';`

// role ids as in CW._config.roles
const ROLE = { systemManager: 'rolesystemmanag', public: 'roleispublixxxx' }

// test users (fake data only)
const USERS = {
  admin: { name: 'user04i8sjhj7zc', email: 'admin@example.test', allowed: [ROLE.systemManager], allowedRead: [ROLE.systemManager] },
  plain: { name: 'user01cc1bg14l1', email: 'plain@example.test', allowed: [ROLE.systemManager], allowedRead: [] },
}

let db = null

// ── D1-shaped wrapper around node:sqlite ───────────────────────
function makeDB(sqlite) {
  const run = (sql, params) => {
    const stmt = sqlite.prepare(sql)
    if (/^\s*(SELECT|WITH|PRAGMA)/i.test(sql)) return { results: stmt.all(...params) }
    const info = stmt.run(...params)
    return { meta: { changes: info.changes } }
  }
  return {
    prepare(sql) {
      let bound = []
      return {
        bind(...p) { bound = p; return this },
        async run() { return run(sql, bound) },
        async all() { const r = run(sql, bound); return { results: r.results || [] } },
        async first() { return (run(sql, bound).results || [])[0] || null },
      }
    },
  }
}

// ── fresh database with seed rows ──────────────────────────────
function resetDb() {
  db = new DatabaseSync(':memory:')
  db.exec(DDL)
  const ins = db.prepare(
    `INSERT INTO item (id,name,doctype,docstatus,domain,owner,_allowed,_allowed_read,created,modified,data)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
  for (const u of Object.values(USERS)) {
    ins.run(u.name, u.name, 'User', 0, DOMAIN, '', JSON.stringify(u.allowed),
      JSON.stringify(u.allowedRead), 1, 1, JSON.stringify({ email: u.email }))
  }
  globalThis.env = { DB: makeDB(db), JWT_SECRET: 'test-secret' }
  return db
}

// ── who is calling CW.run ──────────────────────────────────────
function asUser(key) {
  const u = USERS[key]
  globalThis.currentUser = u
    ? { name: u.name, domain: DOMAIN, _allowed: u.allowed, _allowed_read: u.allowedRead }
    : { domain: DOMAIN }
  return globalThis.currentUser
}

// ── get remote-boot.js source from the hub URL or a local folder ─
async function readBoot(hub) {
  if (/^https?:/.test(hub)) {
    const r = await fetch(hub + 'remote-boot.js')
    if (!r.ok) throw new Error(`node-setup: remote-boot.js → ${r.status}`)
    return r.text()
  }
  return fs.readFileSync(hub + 'remote-boot.js', 'utf8')
}

// ── main entry ─────────────────────────────────────────────────
async function setup({ hub = HUB } = {}) {
  resetDb()
  asUser('admin')
  if (!globalThis.CW_loadFramework) {
    vm.runInThisContext(await readBoot(hub), { filename: 'remote-boot.js' })
  }
  if (!globalThis.CW?.run) await globalThis.CW_loadFramework(hub)
  return { db, CW: globalThis.CW, hub }
}

module.exports = { setup, resetDb, asUser, USERS, ROLE, DOMAIN, get db() { return db } }
