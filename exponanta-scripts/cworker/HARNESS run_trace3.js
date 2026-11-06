const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const vm = require('node:vm');

const db = new DatabaseSync(':memory:');
db.exec(`
CREATE TABLE item (
  id TEXT, name TEXT, doctype TEXT, docstatus INTEGER, title TEXT,
  domain TEXT, owner TEXT, _allowed TEXT, _allowed_read TEXT,
  created INTEGER, modified INTEGER, modified_by TEXT, files TEXT, data TEXT
);
CREATE VIEW item_users AS
SELECT u.id, j.value AS role_id FROM item u, json_each(u._allowed_read) j WHERE u.doctype='User';
`);
db.prepare(`INSERT INTO item (id,name,doctype,docstatus,domain,owner,_allowed,_allowed_read,created,modified,data)
VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
  'user01cc1bg14l1','user01cc1bg14l1','User',0,'hub-cf.i771468.workers.dev','',
  '["rolesystemmanag"]','[]',1793132115863,1793132115863,
  JSON.stringify({ email: 'test@exponanta.com' })
);
db.prepare(`INSERT INTO item (id,name,doctype,docstatus,domain,owner,_allowed,_allowed_read,created,modified,data)
VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
  'user04i8sjhj7zc','user04i8sjhj7zc','User',0,'hub-cf.i771468.workers.dev','',
  '["rolesystemmanag"]','["rolesystemmanag"]',1,1,
  JSON.stringify({ email: 'denis@nesen.org' })
);

function dbRun(sql, params) {
  const stmt = db.prepare(sql);
  const isSelect = /^\s*SELECT/i.test(sql);
  if (isSelect) return { results: stmt.all(...params) };
  const info = stmt.run(...params);
  return { meta: { changes: info.changes } };
}
function makeDB() {
  return { prepare(sql) {
    let bp = [];
    return {
      bind(...p) { bp = p; return this; },
      async run() { return dbRun(sql, bp); },
      async all() { const r = dbRun(sql, bp); console.log('  [DB.all] sql:', sql.replace(/\s+/g,' ').trim().slice(0,200)); console.log('  [DB.all] params:', bp); console.log('  [DB.all] rows:', r.results.length); return { results: r.results || [] }; },
      async first() { const r = dbRun(sql, bp); return (r.results||[])[0] || null; },
    };
  }};
}

const sandbox = {
  console, File: class File {},
  btoa: (s) => Buffer.from(s).toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('utf8'),
  URL, URLSearchParams,
  fetch: async () => { throw new Error('no fetch'); },
  crypto: require('node:crypto').webcrypto,
  Intl, setTimeout,
};
sandbox.globalThis = sandbox;
sandbox.globalThis.CW = { runs: {} };
sandbox.globalThis.env = { DB: makeDB(), JWT_SECRET: 'test-secret' };
sandbox.globalThis.currentUser = null;
const context = vm.createContext(sandbox);
function loadFile(p) { vm.runInContext(fs.readFileSync(p,'utf8'), context, { filename: p }); }

loadFile('/tmp/trace/CW-utils.js');
loadFile('/tmp/trace/CW-state.js');
loadFile('/tmp/trace/CW-config.js');
loadFile('/tmp/trace/CW-run.js');
loadFile('/tmp/trace/CW-adapter-d1.js');

(async () => {
  context.globalThis.currentUser = {
    name: 'user04i8sjhj7zc', domain: 'hub-cf.i771468.workers.dev',
    _allowed: ['rolesystemmanag'], _allowed_read: ['rolesystemmanag'],
  };

  console.log('── Running update, watching every DB call ──');
  const result = await context.globalThis.CW.run({
    operation: 'update',
    target_doctype: 'User',
    query: { where: { name: 'user01cc1bg14l1' } },
    target: { data: [{ name: 'user01cc1bg14l1' }] },
    input: { _allowed_read: ['roletracetest'] },
    options: { render: false },
  });
  console.log('\nFINAL success:', result.success, 'error:', JSON.stringify(result.error));
  console.log('result.target.data[0]:', JSON.stringify(result.target?.data?.[0]));
  const row = db.prepare('SELECT * FROM item WHERE name = ?').get('user01cc1bg14l1');
  console.log('RAW DB _allowed_read:', row._allowed_read);
})();
