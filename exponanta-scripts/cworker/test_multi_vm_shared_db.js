const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const vm = require('node:vm');

// ONE shared SQLite database — real, single instance.
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
  'u_owner','u_owner','User',0,'dom-a','','[]','[]',1,1, JSON.stringify({email:'owner@a.com'})
);
db.prepare(`INSERT INTO item (id,name,doctype,docstatus,domain,owner,_allowed,_allowed_read,created,modified,title,data)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
  't1','t1','Task',0,'dom-a','u_owner','[]','[]',1,1,'owner-only-task', JSON.stringify({subject:'owner-only-task'})
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
      async all() { const r = dbRun(sql, bp); return { results: r.results || [] }; },
      async first() { const r = dbRun(sql, bp); return (r.results||[])[0] || null; },
    };
  }};
}

// ── Create N independent vm contexts, each simulating a different
//    logged-in user, but ALL of them share the single `db` above
//    via the SAME makeDB()-produced binding object.
function createUserVM(userName, userDomain) {
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
  // <-- the key line: every context's env.DB wraps the SAME `db` instance
  sandbox.globalThis.env = { DB: makeDB(), JWT_SECRET: 'test-secret' };
  sandbox.globalThis.currentUser = { name: userName, domain: userDomain };

  const context = vm.createContext(sandbox);
  function loadFile(p) { vm.runInContext(fs.readFileSync(p, 'utf8'), context, { filename: p, timeout: 5000 }); }
  loadFile('/tmp/trace/CW-utils.js');
  loadFile('/tmp/trace/CW-state.js');
  loadFile('/tmp/trace/CW-config.js');
  loadFile('/tmp/trace/CW-run.js');
  loadFile('/tmp/trace/CW-adapter-d1.js');
  return context;
}

(async () => {
  const origLog = console.log;
  console.log = () => {}; // silence boot noise
  const ctxOwner = createUserVM('u_owner', 'dom-a');
  const ctxOther = createUserVM('u_other', 'dom-a'); // no grant on t1
  console.log = origLog;

  console.log('── Each context is a SEPARATE vm (separate CW.runs, separate globalThis) ──');
  console.log('ctxOwner.CW === ctxOther.CW ?', ctxOwner.globalThis.CW === ctxOther.globalThis.CW);

  console.log('\n── But both read/write the SAME underlying SQLite db ──');

  const ownerSelect = await ctxOwner.globalThis.CW.run({
    operation: 'select', target_doctype: 'Task', query: { where: { name: 't1' } }, options: { render: false },
  });
  console.log('owner selecting t1: rows =', ownerSelect.target?.data?.length, '(expect 1)');

  const otherSelect = await ctxOther.globalThis.CW.run({
    operation: 'select', target_doctype: 'Task', query: { where: { name: 't1' } }, options: { render: false },
  });
  console.log('u_other (different vm, no grant) selecting t1: rows =', otherSelect.target?.data?.length, '(expect 0 — ACL still enforced per-context)');

  // Prove it's really the SAME db: owner updates via ctxOwner, then
  // read the change back through ctxOther's OWN connection object.
  await ctxOwner.globalThis.CW.run({
    operation: 'update', target_doctype: 'Task', query: { where: { name: 't1' } },
    input: { subject: 'updated-by-owner-vm' }, options: { render: false },
  });

  // u_other still can't see it via ACL (expected, still denied)
  const otherAfter = await ctxOther.globalThis.CW.run({
    operation: 'select', target_doctype: 'Task', query: { where: { name: 't1' } }, options: { render: false },
  });
  console.log('u_other after owner-vm update, still denied:', (otherAfter.target?.data?.length ?? 0) === 0);

  // but the raw shared DB shows the real change, proving both VMs hit the same storage
  const raw = db.prepare('SELECT data FROM item WHERE name=?').get('t1');
  console.log('\nRaw shared DB row (read directly, outside either vm):', JSON.parse(raw.data).subject, '(expect updated-by-owner-vm)');
})();
